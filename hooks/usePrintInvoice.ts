import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp, Sale, Transfer } from '@/context/AppContext';

const PRINTER_STORAGE_KEY = '@bizpos_saved_printer';

export type PrintState = 'idle' | 'connecting' | 'printing' | 'success' | 'error';

export interface PrinterDevice {
  id: string;
  name: string;
}

export interface DailySummaryData {
  totalSales: number;
  cashCollected: number;
  customerCredit: number;
  stockValue: number;
  salesCount: number;
  periodLabel: string;
  vendorName?: string;
  truckLabel?: string;
}

export interface UsePrintInvoiceReturn {
  print: (sale: Sale) => Promise<void>;
  printTransfer: (transfer: Transfer) => Promise<void>;
  printDailySummary: (data: DailySummaryData) => Promise<void>;
  printTest: () => Promise<void>;
  exportPdf: (sale: Sale) => Promise<string | null>;
  isConnecting: boolean;
  isPrinting: boolean;
  isSuccess: boolean;
  error: string | null;
  retry: () => void;
  currentPrinter: PrinterDevice | null;
  scanPrinters: () => Promise<PrinterDevice[]>;
  connectPrinter: (printer: PrinterDevice) => Promise<void>;
  disconnectPrinter: () => Promise<void>;
  isScanning: boolean;
  availablePrinters: PrinterDevice[];
}

const ERROR_MESSAGES: Record<string, string> = {
  BT_OFF: 'يرجى تفعيل البلوتوث',
  NO_PRINTER: 'لم يتم العثور على طابعة',
  CONNECTION_FAILED: 'فشل الاتصال بالطابعة',
  PRINT_FAILED: 'خطأ أثناء الطباعة',
  PERMISSION_DENIED: 'تم رفض إذن البلوتوث',
  BLE_NOT_AVAILABLE: 'البلوتوث غير متوفر',
};

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS constants
// ─────────────────────────────────────────────────────────────────────────────
const ESC_INIT        = '\x1b\x40';          // Initialize printer
const ESC_ALIGN_LEFT  = '\x1b\x61\x00';
const ESC_ALIGN_CENTER= '\x1b\x61\x01';
const ESC_ALIGN_RIGHT = '\x1b\x61\x02';
const ESC_BOLD_ON     = '\x1b\x45\x01';
const ESC_BOLD_OFF    = '\x1b\x45\x00';
const ESC_DOUBLE_ON   = '\x1b\x21\x30';      // double width + height
const ESC_DOUBLE_OFF  = '\x1b\x21\x00';
const ESC_FEED_CUT    = '\x1d\x56\x41\x03';  // partial cut after feed
const LF              = '\n';
const COL_WIDTH       = 40;                  // characters per line on 80 mm paper
const DASHES          = '-'.repeat(COL_WIDTH);
const DOTS            = '- - - - - - - - - - - - - - - - - - - -';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function padEnd(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

function padStart(str: string, len: number): string {
  if (str.length >= len) return str.slice(-len);
  return ' '.repeat(len - str.length) + str;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS invoice builder
// Produces plain text + ESC/POS commands — works on ANY thermal printer
// ESC/POS printers CANNOT render PDF; sending PDF bytes causes garbled output
// ─────────────────────────────────────────────────────────────────────────────
function buildEscPosInvoice(sale: Sale): string {
  const dateStr = new Date(sale.date).toLocaleDateString('fr-MA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const subtotal  = sale.items.reduce((s, i) => s + i.qty * i.price, 0);
  const remaining = sale.amount - sale.paid;
  const returnAmt = sale.returnAmount || 0;
  const statusLabel =
    sale.status === 'paid'    ? 'PAYE'    :
    sale.status === 'partial' ? 'PARTIEL' : 'IMPAYE';

  let doc = '';

  // Init
  doc += ESC_INIT;

  // ── Header ──────────────────────────────────────────────────────────────
  doc += ESC_ALIGN_CENTER;
  doc += ESC_DOUBLE_ON + 'FLURRY' + ESC_DOUBLE_OFF + LF;
  doc += DOTS + LF;
  doc += ESC_BOLD_ON + `FACTURE #${sale.invoiceNumber}` + ESC_BOLD_OFF + LF;
  doc += DASHES + LF;

  // ── Meta ─────────────────────────────────────────────────────────────────
  doc += ESC_ALIGN_LEFT;
  doc += padEnd('Date:', 16) + dateStr + LF;
  doc += padEnd('Reglement:', 16) + sale.paymentMethod + LF;
  doc += DASHES + LF;

  // ── Bill-to ───────────────────────────────────────────────────────────────
  doc += ESC_BOLD_ON + 'FACTURE A:' + ESC_BOLD_OFF + LF;
  doc += sale.customerName + LF;
  if (sale.customerPhone) doc += sale.customerPhone + LF;
  doc += DASHES + LF;

  // ── Items header ──────────────────────────────────────────────────────────
  doc += ESC_BOLD_ON;
  doc += padEnd('ARTICLE', 20)
       + padEnd('QTE', 5)
       + padStart('P.U.', 7)
       + padStart('TOTAL', 8) + LF;
  doc += ESC_BOLD_OFF;
  doc += DASHES + LF;

  // ── Items rows ────────────────────────────────────────────────────────────
  for (const item of sale.items) {
    const lineTotal = item.qty * item.price;
    const name = item.name.slice(0, 19);
    doc += padEnd(name, 20)
         + padEnd(String(item.qty), 5)
         + padStart(fmt(item.price), 7)
         + padStart(fmt(lineTotal), 8) + LF;
  }

  doc += DASHES + LF;

  // ── Subtotal / discount ───────────────────────────────────────────────────
  doc += padEnd('Sous-total:', 28) + padStart(`MAD ${fmt(subtotal)}`, 12) + LF;

  if (sale.discount > 0) {
    const disc = subtotal * sale.discount / 100;
    doc += padEnd(`Remise (${sale.discount}%):`, 28) + padStart(`-MAD ${fmt(disc)}`, 12) + LF;
  }

  if (returnAmt > 0) {
    doc += padEnd('Retour marchandise:', 28) + padStart(`-MAD ${fmt(returnAmt)}`, 12) + LF;
  }

  // ── Grand total ───────────────────────────────────────────────────────────
  doc += DASHES + LF;
  doc += ESC_ALIGN_CENTER;
  doc += ESC_BOLD_ON + ESC_DOUBLE_ON;
  doc += `TOTAL: MAD ${fmt(sale.amount)}`;
  doc += ESC_DOUBLE_OFF + ESC_BOLD_OFF + LF;
  doc += DASHES + LF;

  // ── Payment summary ───────────────────────────────────────────────────────
  doc += ESC_ALIGN_LEFT;
  doc += padEnd('Paye:', 28) + padStart(`MAD ${fmt(sale.paid)}`, 12) + LF;

  if (remaining > 0) {
    doc += ESC_BOLD_ON;
    doc += padEnd('Reste a payer:', 28) + padStart(`MAD ${fmt(remaining)}`, 12) + LF;
    doc += ESC_BOLD_OFF;
  }

  // ── Status ────────────────────────────────────────────────────────────────
  doc += ESC_ALIGN_CENTER;
  doc += DOTS + LF;
  doc += ESC_BOLD_ON + `[ ${statusLabel} ]` + ESC_BOLD_OFF + LF;
  doc += DOTS + LF;

  // ── Footer ────────────────────────────────────────────────────────────────
  doc += 'Merci pour votre confiance!' + LF;
  doc += LF + LF + LF;

  // ── Feed + cut ────────────────────────────────────────────────────────────
  doc += ESC_FEED_CUT;

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS transfer builder
// ─────────────────────────────────────────────────────────────────────────────
function buildEscPosTransfer(transfer: Transfer): string {
  let doc = ESC_INIT;

  doc += ESC_ALIGN_CENTER;
  doc += ESC_BOLD_ON + 'TRANSFERT STOCK' + ESC_BOLD_OFF + LF;
  doc += DASHES + LF;

  doc += ESC_ALIGN_LEFT;
  doc += padEnd('Ref:', 16) + transfer.ref + LF;
  doc += padEnd('Date:', 16) + new Date(transfer.date).toLocaleString('fr-MA') + LF;
  doc += padEnd('De:', 16) + transfer.from + LF;
  doc += padEnd('Vers:', 16) + transfer.to + LF;
  doc += DASHES + LF;

  // Items header
  doc += ESC_BOLD_ON;
  doc += padEnd('ARTICLE', 22) + padEnd('QTE', 6) + padStart('TOTAL', 12) + LF;
  doc += ESC_BOLD_OFF;
  doc += DASHES + LF;

  for (const i of transfer.items) {
    const t = i.qty * (parseFloat(i.unit) || 0);
    doc += padEnd(i.name.slice(0, 21), 22)
         + padEnd(String(i.qty), 6)
         + padStart(`${fmt(t)} MAD`, 12) + LF;
  }

  doc += DASHES + LF;
  doc += ESC_BOLD_ON;
  doc += padEnd('TOTAL:', 28) + padStart(`MAD ${fmt(transfer.total)}`, 12) + LF;
  doc += ESC_BOLD_OFF;

  doc += LF + LF + LF + ESC_FEED_CUT;
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS daily summary builder
// ─────────────────────────────────────────────────────────────────────────────
function buildEscPosDailySummary(data: DailySummaryData): string {
  const today = new Date().toLocaleDateString('fr-MA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  let doc = ESC_INIT;

  doc += ESC_ALIGN_CENTER;
  doc += ESC_BOLD_ON + 'RESUME JOURNALIER' + ESC_BOLD_OFF + LF;
  doc += DASHES + LF;

  doc += ESC_ALIGN_LEFT;
  doc += padEnd('Date:', 20) + today + LF;
  doc += padEnd('Periode:', 20) + data.periodLabel + LF;
  if (data.vendorName) doc += padEnd('Vendeur:', 20) + data.vendorName + LF;
  if (data.truckLabel) doc += padEnd('Camion:', 20) + data.truckLabel + LF;
  doc += DASHES + LF;

  doc += ESC_BOLD_ON;
  doc += padEnd('Total ventes:', 28) + padStart(`MAD ${fmt(data.totalSales)}`, 12) + LF;
  doc += ESC_BOLD_OFF;
  doc += padEnd('Encaisse:', 28) + padStart(`MAD ${fmt(data.cashCollected)}`, 12) + LF;
  doc += padEnd('Credit clients:', 28) + padStart(`MAD ${fmt(data.customerCredit)}`, 12) + LF;
  doc += DASHES + LF;
  doc += padEnd('Stock restant:', 28) + padStart(`MAD ${fmt(data.stockValue)}`, 12) + LF;
  doc += padEnd('Nb. factures:', 28) + padStart(String(data.salesCount), 12) + LF;
  doc += DASHES + LF;

  doc += ESC_ALIGN_CENTER;
  doc += `BizPOS - ${today}` + LF;
  doc += LF + LF + LF + ESC_FEED_CUT;
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML invoice builder (used ONLY for exportPdf / system print dialog)
// ─────────────────────────────────────────────────────────────────────────────
export async function buildInvoiceHtml(sale: Sale): Promise<string> {
  let logoTag = `<div class="store-name">FLURRY</div>`;
  try {
    const logoAsset = require('../../assets/flurry-logo.png');
    const { Asset } = await import('expo-asset');
    const [asset] = await Asset.loadAsync(logoAsset);
    if (asset.localUri) {
      const b64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: 'base64' as any,
      });
      logoTag = `<img src="data:image/png;base64,${b64}" class="logo" />`;
    }
  } catch (e) {
    // fallback to text
  }

  const dateStr = new Date(sale.date).toLocaleDateString('fr-MA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const subtotal  = sale.items.reduce((s, i) => s + i.qty * i.price, 0);
  const remaining = sale.amount - sale.paid;
  const returnAmt = sale.returnAmount || 0;

  const statusLabel =
    sale.status === 'paid'    ? 'PAYÉ'    :
    sale.status === 'partial' ? 'PARTIEL' : 'IMPAYÉ';
  const statusColor =
    sale.status === 'paid'    ? '#059669' :
    sale.status === 'partial' ? '#d97706' : '#e11d48';

  const itemRows = sale.items.map(item => `
    <tr>
      <td class="td-name">${item.name}</td>
      <td class="td-center">${item.qty}</td>
      <td class="td-right">${fmt(item.price)}</td>
      <td class="td-right td-bold">${fmt(item.qty * item.price)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=80mm"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width: 360px;
      font-family: 'Cairo', Arial, sans-serif;
      background: #fff; color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 12px 14px;
    }
    .logo       { display:block; width:160px; height:auto; margin:0 auto 6px; }
    .store-name { text-align:center; font-size:22px; font-weight:900; letter-spacing:3px; margin-bottom:6px; }
    .dash  { border:none; border-top:1px dashed #ccc; margin:7px 0; }
    .solid { border:none; border-top:1px solid  #ccc; margin:7px 0; }
    .inv-title { text-align:center; font-size:13px; font-weight:900; letter-spacing:1.5px; margin:8px 0; }
    .kv       { display:flex; justify-content:space-between; font-size:11px; margin:2px 0; }
    .kv-label { color:#444; }
    .kv-value { font-weight:600; }
    .bill-lbl  { font-size:10px; font-weight:900; letter-spacing:1px; margin-bottom:2px; }
    .bill-name { font-size:14px; font-weight:700; }
    .bill-phone{ font-size:11px; color:#555; margin-top:1px; }
    table    { width:100%; border-collapse:collapse; margin:2px 0; }
    thead th { font-size:10px; font-weight:900; letter-spacing:.4px; padding:3px 2px; border-bottom:1px solid #000; }
    .td-name   { font-size:11px; padding:4px 2px; }
    .td-center { font-size:11px; padding:4px 2px; text-align:center; }
    .td-right  { font-size:11px; padding:4px 2px; text-align:right; }
    .td-bold   { font-weight:700; }
    tr:nth-child(even) td { background:#f8f8f8; }
    .sum-row   { display:flex; justify-content:space-between; font-size:11px; margin:3px 0; }
    .sum-label { color:#555; }
    .sum-val   { font-weight:600; }
    .sum-valbold{ font-weight:900; }
    .total-box {
      display:flex; justify-content:space-between; align-items:center;
      border-top:2px solid #000; border-bottom:2px solid #000;
      padding:7px 0; margin:5px 0;
    }
    .total-lbl { font-size:14px; font-weight:900; letter-spacing:1px; }
    .total-val { font-size:20px; font-weight:900; }
    .status-wrap  { text-align:center; margin:7px 0; }
    .status-badge {
      display:inline-block; padding:2px 12px; border-radius:20px;
      font-size:11px; font-weight:700; border:1.5px solid;
    }
    .footer-ar { font-size:13px; font-weight:600; color:#444; text-align:center; direction:rtl; margin:3px 0; }
    .footer-fr { font-size:11px; color:#666; text-align:center; margin:2px 0; }
    .footer-sm { font-size:9px; color:#bbb; text-align:center; margin-top:5px; }
    @media print { body { width:80mm; padding:0 2mm; } }
  </style>
</head>
<body>
  ${logoTag}
  <hr class="dash"/>
  <div class="inv-title">FACTURE #${sale.invoiceNumber}</div>
  <div class="kv"><span class="kv-label">Date</span><span class="kv-value">${dateStr}</span></div>
  <div class="kv"><span class="kv-label">Règlement</span><span class="kv-value">${sale.paymentMethod}</span></div>
  <hr class="solid"/>
  <div class="bill-lbl">FACTURÉ À</div>
  <div class="bill-name">${sale.customerName}</div>
  ${sale.customerPhone ? `<div class="bill-phone">${sale.customerPhone}</div>` : ''}
  <hr class="solid"/>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">ARTICLE</th>
        <th style="text-align:center;">QTÉ</th>
        <th style="text-align:right;">P.U.</th>
        <th style="text-align:right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="solid"/>
  <div class="sum-row">
    <span class="sum-label">Sous-total</span>
    <span class="sum-val">MAD ${fmt(subtotal)}</span>
  </div>
  ${sale.discount > 0 ? `
  <div class="sum-row">
    <span class="sum-label">Remise (${sale.discount}%)</span>
    <span class="sum-val">- MAD ${fmt(subtotal * sale.discount / 100)}</span>
  </div>` : ''}
  ${returnAmt > 0 ? `
  <div class="sum-row">
    <span class="sum-label">Retour marchandise</span>
    <span class="sum-val">- MAD ${fmt(returnAmt)}</span>
  </div>` : ''}
  <div class="total-box">
    <span class="total-lbl">TOTAL NET</span>
    <span class="total-val">MAD ${fmt(sale.amount)}</span>
  </div>
  <div class="sum-row">
    <span class="sum-label">Payé</span>
    <span class="sum-val">MAD ${fmt(sale.paid)}</span>
  </div>
  ${remaining > 0 ? `
  <div class="sum-row">
    <span class="sum-label">Reste à payer</span>
    <span class="sum-valbold">MAD ${fmt(remaining)}</span>
  </div>` : ''}
  <div class="status-wrap">
    <span class="status-badge" style="color:${statusColor};border-color:${statusColor};">
      ${statusLabel}
    </span>
  </div>
  <hr class="dash"/>
  <div class="footer-fr">Merci pour votre confiance!</div>
  <div class="footer-sm">Powered by BizPOS</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core BT sender — sends raw ESC/POS string over Bluetooth SPP
// For system print dialog (no BT printer), falls back to expo-print HTML
// ─────────────────────────────────────────────────────────────────────────────
async function sendEscPosToPrinter(
  escPos: string,
  html: string,
  printer: PrinterDevice | null,
  btDevice: any | null,
  btLib: any | null,
): Promise<void> {
  // ── Path A: no BT printer configured → system print dialog ──────────────
  if (!btLib || !printer) {
    await Print.printAsync({ html, width: 360 });
    return;
  }

  // ── Path B: Bluetooth ESC/POS thermal printer ────────────────────────────
  // IMPORTANT: Never send PDF bytes to a thermal printer.
  // We send raw ESC/POS text commands only.

  // Ensure connection
  let device = btDevice;
  if (!device) {
    device = await btLib.connectToDevice(printer.id);
  } else {
    const ok = await device.isConnected().catch(() => false);
    if (!ok) device = await btLib.connectToDevice(printer.id);
  }

  // Send ESC/POS string in chunks to avoid BT buffer overflow
  const CHUNK = 512;
  for (let i = 0; i < escPos.length; i += CHUNK) {
    await device.write(escPos.slice(i, i + CHUNK));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function usePrintInvoice(): UsePrintInvoiceReturn {
  const { sales } = useApp();
  const [state, setState]               = useState<PrintState>('idle');
  const [error, setError]               = useState<string | null>(null);
  const [currentPrinter, setCurrentPrinter] = useState<PrinterDevice | null>(null);
  const [isScanning, setIsScanning]     = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const btLib    = useRef<any>(null);
  const btDevice = useRef<any>(null);

  useEffect(() => {
    loadSavedPrinter();
    import('react-native-bluetooth-classic')
      .then(lib => { btLib.current = lib.default; })
      .catch(() => {});
  }, []);

  const loadSavedPrinter = async () => {
    try {
      const saved = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (saved) setCurrentPrinter(JSON.parse(saved));
    } catch {}
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const v = Platform.Version as number;
      const perms = v >= 31
        ? ['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT', PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]
        : ['android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN', PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(perms as any);
      return Object.values(results).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  };

  const scanPrinters = useCallback(async (): Promise<PrinterDevice[]> => {
    if (!btLib.current) { setError(ERROR_MESSAGES.BLE_NOT_AVAILABLE); return []; }
    if (!(await requestPermissions())) return [];
    setIsScanning(true);
    setAvailablePrinters([]);
    try {
      const paired = await btLib.current.getBondedDevices();
      const devices: PrinterDevice[] = (paired || []).map((d: any) => ({
        id: d.address,
        name: d.name || d.address,
      }));
      setAvailablePrinters(devices);
      return devices;
    } catch {
      setError(ERROR_MESSAGES.NO_PRINTER);
      return [];
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connectPrinter = useCallback(async (printer: PrinterDevice) => {
    if (!btLib.current) { setError(ERROR_MESSAGES.NO_PRINTER); return; }
    if (!(await requestPermissions())) return;
    setState('connecting');
    setError(null);
    try {
      if (btDevice.current) {
        try { await btDevice.current.disconnect(); } catch {}
        btDevice.current = null;
      }
      btDevice.current = await btLib.current.connectToDevice(printer.id);
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
      setCurrentPrinter(printer);
      setState('idle');
    } catch {
      setError(ERROR_MESSAGES.CONNECTION_FAILED);
      setState('error');
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    if (btDevice.current) {
      try { await btDevice.current.disconnect(); } catch {}
      btDevice.current = null;
    }
    setCurrentPrinter(null);
    await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
  }, []);

  // ── print (sale invoice) ──────────────────────────────────────────────────
  const print = useCallback(async (sale: Sale) => {
    setState('printing');
    setError(null);
    try {
      // ESC/POS for BT printer
      const escPos = buildEscPosInvoice(sale);
      // HTML for system print dialog fallback
      const html   = await buildInvoiceHtml(sale);
      await sendEscPosToPrinter(escPos, html, currentPrinter, btDevice.current, btLib.current);
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err: any) {
      console.error('Print error:', err);
      setError(ERROR_MESSAGES.PRINT_FAILED);
      setState('error');
    }
  }, [currentPrinter]);

  // ── exportPdf — save / share invoice as PDF (NOT for BT printing) ─────────
  const exportPdf = useCallback(async (sale: Sale): Promise<string | null> => {
    try {
      const html = await buildInvoiceHtml(sale);
      const { uri } = await Print.printToFileAsync({ html, width: 360 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Facture #${sale.invoiceNumber}`,
          UTI: 'com.adobe.pdf',
        });
      }
      return uri;
    } catch (e) {
      console.error('PDF export error:', e);
      return null;
    }
  }, []);

  // ── printTransfer ─────────────────────────────────────────────────────────
  const printTransfer = useCallback(async (transfer: Transfer) => {
    setState('printing');
    setError(null);
    try {
      const escPos = buildEscPosTransfer(transfer);

      // HTML fallback for system dialog
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
        <style>
          body{width:360px;font-family:'Cairo',Arial,sans-serif;padding:12px 14px;}
          h2{text-align:center;font-size:14px;font-weight:900;letter-spacing:1px;margin-bottom:8px;}
          .kv{display:flex;justify-content:space-between;font-size:11px;margin:2px 0;}
          table{width:100%;border-collapse:collapse;margin:6px 0;}
          th{font-size:10px;font-weight:900;border-bottom:1px solid #000;padding:3px 2px;}
          td{font-size:11px;padding:3px 2px;}
          .total{display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-top:6px;border-top:2px solid #000;padding-top:6px;}
          hr{border:none;border-top:1px dashed #ccc;margin:7px 0;}
        </style></head><body>
        <h2>TRANSFERT STOCK</h2><hr/>
        <div class="kv"><span>Réf:</span><span><b>${transfer.ref}</b></span></div>
        <div class="kv"><span>Date:</span><span>${new Date(transfer.date).toLocaleString('fr-MA')}</span></div>
        <div class="kv"><span>De:</span><span><b>${transfer.from}</b></span></div>
        <div class="kv"><span>Vers:</span><span><b>${transfer.to}</b></span></div>
        <hr/>
        <table><thead><tr>
          <th style="text-align:left">Article</th>
          <th style="text-align:center">Qté</th>
          <th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>${transfer.items.map(i => `
          <tr>
            <td>${i.name}</td>
            <td style="text-align:center">${i.qty}</td>
            <td style="text-align:right">${fmt(i.qty * (parseFloat(i.unit) || 0))} MAD</td>
          </tr>`).join('')}
        </tbody></table>
        <div class="total"><span>TOTAL</span><span>MAD ${fmt(transfer.total)}</span></div>
        </body></html>`;

      await sendEscPosToPrinter(escPos, html, currentPrinter, btDevice.current, btLib.current);
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err: any) {
      console.error('Print transfer error:', err);
      setError(ERROR_MESSAGES.PRINT_FAILED);
      setState('error');
    }
  }, [currentPrinter]);

  // ── printDailySummary ─────────────────────────────────────────────────────
  const printDailySummary = useCallback(async (data: DailySummaryData) => {
    setState('printing');
    setError(null);
    try {
      const escPos = buildEscPosDailySummary(data);

      const today = new Date().toLocaleDateString('fr-MA', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      // HTML fallback for system dialog
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"/>
        <style>
          body{width:360px;font-family:'Cairo',Arial,sans-serif;padding:12px 14px;}
          h2{text-align:center;font-size:14px;font-weight:900;letter-spacing:1px;margin-bottom:8px;}
          .kv{display:flex;justify-content:space-between;font-size:11px;margin:3px 0;}
          .kv.bold span{font-weight:900;font-size:13px;}
          hr{border:none;border-top:1px solid #ccc;margin:7px 0;}
          .foot{text-align:center;font-size:9px;color:#888;margin-top:8px;}
        </style></head><body>
        <h2>RÉSUMÉ JOURNALIER</h2><hr/>
        <div class="kv"><span>Date</span><span>${today}</span></div>
        <div class="kv"><span>Période</span><span>${data.periodLabel}</span></div>
        ${data.vendorName ? `<div class="kv"><span>Vendeur</span><span>${data.vendorName}</span></div>` : ''}
        ${data.truckLabel ? `<div class="kv"><span>Camion</span><span>${data.truckLabel}</span></div>` : ''}
        <hr/>
        <div class="kv bold"><span>Total ventes</span><span>MAD ${fmt(data.totalSales)}</span></div>
        <div class="kv"><span>Encaissé</span><span>MAD ${fmt(data.cashCollected)}</span></div>
        <div class="kv"><span>Crédit clients</span><span>MAD ${fmt(data.customerCredit)}</span></div>
        <hr/>
        <div class="kv"><span>Stock restant</span><span>MAD ${fmt(data.stockValue)}</span></div>
        <div class="kv"><span>Nb. factures</span><span>${data.salesCount}</span></div>
        <div class="foot">BizPOS – ${today}</div>
        </body></html>`;

      await sendEscPosToPrinter(escPos, html, currentPrinter, btDevice.current, btLib.current);
      setState('success');
      setTimeout(() => setState('idle'), 2500);
    } catch (err: any) {
      console.error('Print summary error:', err);
      setError(ERROR_MESSAGES.PRINT_FAILED);
      setState('error');
    }
  }, [currentPrinter]);

  // ── printTest ─────────────────────────────────────────────────────────────
  const printTest = useCallback(async () => {
    setState('printing');
    setError(null);
    try {
      let escPos = ESC_INIT;
      escPos += ESC_ALIGN_CENTER;
      escPos += ESC_DOUBLE_ON + '*** TEST ***' + ESC_DOUBLE_OFF + LF;
      escPos += DASHES + LF;
      escPos += ESC_ALIGN_LEFT;
      escPos += padEnd('Imprimante:', 16) + (currentPrinter?.name ?? 'Systeme') + LF;
      escPos += padEnd('MAC:', 16)        + (currentPrinter?.id   ?? 'N/A')     + LF;
      escPos += padEnd('Papier:', 16)     + '80mm | ESC/POS'                    + LF;
      escPos += DASHES + LF;
      escPos += ESC_ALIGN_CENTER;
      escPos += ESC_BOLD_ON + 'BizPOS OK' + ESC_BOLD_OFF + LF;
      escPos += LF + LF + LF + ESC_FEED_CUT;

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
        <style>body{width:360px;font-family:Arial,sans-serif;text-align:center;padding:20px;}
        h2{font-size:16px;letter-spacing:2px;margin-bottom:10px;}p{font-size:12px;margin:4px 0;}</style></head>
        <body><h2>*** TEST IMPRESSION ***</h2>
        <p>Imprimante: ${currentPrinter?.name ?? 'Système'}</p>
        <p>MAC: ${currentPrinter?.id ?? 'N/A'}</p>
        <p>Papier: 80mm | ESC/POS</p>
        <hr/><p style="font-size:14px;font-weight:900;">BizPOS ✓</p></body></html>`;

      await sendEscPosToPrinter(escPos, html, currentPrinter, btDevice.current, btLib.current);
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err: any) {
      setError(ERROR_MESSAGES.PRINT_FAILED);
      setState('error');
    }
  }, [currentPrinter]);

  const retry = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return {
    print,
    printTransfer,
    printDailySummary,
    printTest,
    exportPdf,
    isConnecting: state === 'connecting',
    isPrinting:   state === 'printing',
    isSuccess:    state === 'success',
    error,
    retry,
    currentPrinter,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    isScanning,
    availablePrinters,
  };
}