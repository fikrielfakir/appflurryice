import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp, Sale } from '@/context/AppContext';

const PRINTER_STORAGE_KEY = '@bizpos_saved_printer';
const PAPER_WIDTH = 384;

export type PrintState = 'idle' | 'connecting' | 'printing' | 'success' | 'error';

export interface PrinterDevice {
  id: string;
  name: string;
}

export interface UsePrintInvoiceReturn {
  print: (sale: Sale) => Promise<void>;
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
  BT_OFF: 'Veuillez activer le Bluetooth',
  NO_PRINTER: 'Aucune imprimante trouvée',
  CONNECTION_FAILED: 'Échec de connexion à l\'imprimante',
  PRINT_FAILED: 'Erreur lors de l\'impression',
  PERMISSION_DENIED: 'Permission Bluetooth refusée',
  BLE_NOT_AVAILABLE: 'Bluetooth non disponible',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateReceiptText(sale: Sale): string {
  const lines: string[] = [];
  const width = 32;
  
  const center = (s: string) => s.padStart((width + s.length) / 2).padEnd(width);
  const leftRight = (l: string, r: string) => l.padEnd(width - r.length) + r;
  
  lines.push(center('FACTURE'));
  lines.push('-'.repeat(width));
  lines.push(`Facture #: ${sale.invoiceNumber}`);
  lines.push(`Date: ${new Date(sale.date).toLocaleString('fr-FR')}`);
  lines.push(`Client: ${sale.customerName}`);
  if (sale.customerPhone) {
    lines.push(`Tel: ${sale.customerPhone}`);
  }
  lines.push('-'.repeat(width));
  
  for (const item of sale.items) {
    const line = `${item.name} x${item.qty}`;
    const price = fmt(item.qty * item.price);
    lines.push(leftRight(line, price));
  }
  
  lines.push('-'.repeat(width));
  lines.push(leftRight('TOTAL', fmt(sale.amount) + ' MAD'));
  lines.push(leftRight('PAID', fmt(sale.paid) + ' MAD'));
  
  if (sale.amount - sale.paid > 0) {
    lines.push(leftRight('DUE', fmt(sale.amount - sale.paid) + ' MAD'));
  }
  
  lines.push('-'.repeat(width));
  lines.push(leftRight('Status', sale.status.toUpperCase()));
  lines.push(leftRight('Method', sale.paymentMethod));
  lines.push('');
  lines.push(center('Merci pour votre confiance!'));
  lines.push('');
  
  return lines.join('\n');
}

export function usePrintInvoice(): UsePrintInvoiceReturn {
  const { sales } = useApp();
  const [state, setState] = useState<PrintState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentPrinter, setCurrentPrinter] = useState<PrinterDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterDevice[]>([]);
  const retryFn = useRef<(() => void) | null>(null);
  const BleManager = useRef<any>(null);
  const Printer = useRef<any>(null);

  useEffect(() => {
    loadSavedPrinter();
    initLibraries();
  }, []);

  const initLibraries = async () => {
    try {
      const BLE = await import('react-native-ble-manager');
      BleManager.current = BLE.default;
      await BleManager.current.start({ showAlert: false });
    } catch (e) {
      console.log('BLE Manager not available:', e);
    }
    
    try {
      const ESCPOS = await import('react-native-esc-pos-printer');
      Printer.current = ESCPOS.default;
    } catch (e) {
      console.log('ESC POS Printer not available:', e);
    }
  };

  const loadSavedPrinter = async () => {
    try {
      const saved = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (saved) {
        const printer = JSON.parse(saved) as PrinterDevice;
        setCurrentPrinter(printer);
      }
    } catch (e) {
      console.log('Error loading printer:', e);
    }
  };

  const savePrinter = async (printer: PrinterDevice) => {
    try {
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer));
      setCurrentPrinter(printer);
    } catch (e) {
      console.log('Error saving printer:', e);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const androidVersion = Platform.Version;
        
        if (typeof androidVersion === 'number' && androidVersion >= 31) {
          const bluetoothScan = await PermissionsAndroid.request(
            'android.permission.BLUETOOTH_SCAN' as any,
            {
              title: 'Bluetooth Permission',
              message: 'Application needs Bluetooth to connect to printer',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          const bluetoothConnect = await PermissionsAndroid.request(
            'android.permission.BLUETOOTH_CONNECT' as any,
            {
              title: 'Bluetooth Connect Permission',
              message: 'Application needs Bluetooth to connect to printer',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          const location = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Location is required for BLE scanning',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (
            bluetoothScan === PermissionsAndroid.RESULTS.GRANTED &&
            bluetoothConnect === PermissionsAndroid.RESULTS.GRANTED &&
            location === PermissionsAndroid.RESULTS.GRANTED
          ) {
            return true;
          }
          
          setError(ERROR_MESSAGES.PERMISSION_DENIED);
          return false;
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            'android.permission.BLUETOOTH' as any,
            'android.permission.BLUETOOTH_ADMIN' as any,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          const allGranted = Object.values(granted).every(
            v => v === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (!allGranted) {
            setError(ERROR_MESSAGES.PERMISSION_DENIED);
            return false;
          }
          return true;
        }
      } catch (err) {
        console.error('Permission error:', err);
        setError(ERROR_MESSAGES.PERMISSION_DENIED);
        return false;
      }
    }
    
    return true;
  };

  const scanPrinters = useCallback(async (): Promise<PrinterDevice[]> => {
    if (!BleManager.current) {
      setError(ERROR_MESSAGES.BLE_NOT_AVAILABLE);
      return [];
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return [];
    }

    setIsScanning(true);
    setAvailablePrinters([]);

    try {
      const devices: PrinterDevice[] = [];
      
      BleManager.current.addListener('BleManagerDiscoverPeripheral', (peripheral: any) => {
        if (peripheral.name) {
          const device: PrinterDevice = {
            id: peripheral.id,
            name: peripheral.name,
          };
          if (!devices.find(d => d.id === device.id)) {
            devices.push(device);
            setAvailablePrinters([...devices]);
          }
        }
      });

      await BleManager.current.scan([], 5, true);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await BleManager.current.stopScan();
      
      setIsScanning(false);
      return devices;
    } catch (err) {
      console.error('Scan error:', err);
      setIsScanning(false);
      setError(ERROR_MESSAGES.NO_PRINTER);
      return [];
    }
  }, []);

  const connectPrinter = useCallback(async (printer: PrinterDevice) => {
    if (!BleManager.current || !Printer.current) {
      setError(ERROR_MESSAGES.NO_PRINTER);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return;
    }

    setState('connecting');
    setError(null);

    try {
      await Printer.current.init({
        width: PAPER_WIDTH,
        deviceId: printer.id,
      });
      
      await savePrinter(printer);
      setState('idle');
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(ERROR_MESSAGES.CONNECTION_FAILED);
      setState('error');
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    if (BleManager.current && currentPrinter) {
      try {
        await BleManager.current.disconnect(currentPrinter.id);
      } catch (e) {
        console.log('Disconnect error:', e);
      }
    }
    setCurrentPrinter(null);
    await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
  }, [currentPrinter]);

  const print = useCallback(async (sale: Sale) => {
    if (!Printer.current || !BleManager.current) {
      setError(ERROR_MESSAGES.NO_PRINTER);
      setState('error');
      return;
    }

    if (!currentPrinter) {
      setError(ERROR_MESSAGES.NO_PRINTER);
      setState('error');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setState('error');
      return;
    }

    setState('connecting');
    setError(null);

    try {
      await Printer.current.init({
        width: PAPER_WIDTH,
        deviceId: currentPrinter.id,
      });

      setState('printing');

      const text = generateReceiptText(sale);
      
      await Printer.current.printText(text, {
        encoding: 'UTF-8',
        codepage: 0,
        widthTimes: 0,
        heightTimes: 0,
        fontType: 0,
      });

      await Printer.current.cut();
      
      setState('success');
      
      setTimeout(() => {
        setState('idle');
      }, 2000);
      
    } catch (err: any) {
      console.error('Print error:', err);
      
      const errMsg = err.message?.toLowerCase() || '';
      if (errMsg.includes('bluetooth')) {
        setError(ERROR_MESSAGES.BT_OFF);
      } else if (errMsg.includes('connect') || errMsg.includes('connection')) {
        setError(ERROR_MESSAGES.CONNECTION_FAILED);
      } else {
        setError(ERROR_MESSAGES.PRINT_FAILED);
      }
      setState('error');
    }
  }, [currentPrinter]);

  const retry = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  retryFn.current = retry;

  return {
    print,
    isConnecting: state === 'connecting',
    isPrinting: state === 'printing',
    isSuccess: state === 'success',
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
