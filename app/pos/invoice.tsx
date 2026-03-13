import React, { useMemo, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Share, Image, ActivityIndicator, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";
import { Sale, useApp } from "@/context/AppContext";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Thermal invoice colours (black on white ONLY) ─────────────────────────────
const T = {
  ink: "#000000",
  inkLight: "#444444",
  bg: "#FFFFFF",
  divider: "#CCCCCC",
};

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const params = useLocalSearchParams<{
    invoiceNumber: string; customerName: string; customerPhone: string;
    total: string; paid: string; remaining: string; change: string;
    returnAmount: string; status: string; paymentMethod: string;
    date: string; discount: string; itemsJson: string;
    isPreview?: string; vendeur: string;
  }>();

  const { print, isConnecting, isPrinting, isSuccess, error, retry, state } = usePrintInvoice();
  const isPreview = params.isPreview === "true";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const items: { name: string; qty: number; price: number }[] = params.itemsJson
    ? JSON.parse(params.itemsJson) : [];

  const sale: Sale = useMemo(() => ({
    id: params.invoiceNumber || Date.now().toString(),
    invoiceNumber: params.invoiceNumber || "",
    customerName: params.customerName || "",
    customerPhone: params.customerPhone || "",
    amount: parseFloat(params.total?.replace(/,/g, "") || "0"),
    paid: parseFloat(params.paid?.replace(/,/g, "") || "0"),
    discount: parseFloat(params.discount || "0"),
    shippingFee: 0,
    returnAmount: parseFloat(params.returnAmount?.replace(/,/g, "") || "0"),
    status: (params.status as "paid" | "partial" | "due") || "paid",
    paymentMethod: params.paymentMethod || "cash",
    date: params.date || new Date().toISOString(),
    items: items.map((i) => ({ ...i, id: i.name })),
    vendeur: params.vendeur || "",
  }), [params, items]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discountPct = parseFloat(params.discount || "0");
  const total = parseFloat(params.total?.replace(/,/g, "") || "0");
  const paid = parseFloat(params.paid?.replace(/,/g, "") || "0");
  const remaining = parseFloat(params.remaining?.replace(/,/g, "") || "0");
  const returnAmt = parseFloat(params.returnAmount?.replace(/,/g, "") || "0");
  const dateObj = params.date ? new Date(params.date) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  const statusColor = params.status === "paid" ? D.emerald : params.status === "partial" ? D.amber : D.rose;
  const statusBg = params.status === "paid" ? D.emeraldBg : params.status === "partial" ? D.amberBg : D.roseBg;
  const statusLabel = params.status === "paid" ? "Payé" : params.status === "partial" ? "Partiel" : "Impayé";

  const qrData = JSON.stringify({
    invoice: params.invoiceNumber,
    customer: params.customerName,
    total,
    date: dateStr,
    items: items.map((i) => ({ n: i.name, q: i.qty, p: i.price })),
  });

  useEffect(() => {
    if (isConnecting || isPrinting || isSuccess || state === 'queued' || error) {
      setShowPrintModal(true);
    } else {
      setShowPrintModal(false);
    }
  }, [isConnecting, isPrinting, isSuccess, error, state]);

  async function handleShare() {
    try {
      const text = [
        `فاتورة رقم #${params.invoiceNumber}`,
        `التاريخ: ${dateStr}`,
        `الزبون: ${params.customerName}${params.customerPhone ? ` (${params.customerPhone})` : ""}`,
        ``,
        ...items.map((i) => `${i.name}  x${i.qty}  ${fmt(i.price)}  =  MAD ${fmt(i.qty * i.price)}`),
        ``,
        `المجموع الفرعي: MAD ${fmt(subtotal)}`,
        discountPct > 0 ? `الخصم: ${discountPct}%` : null,
        `المجموع: MAD ${fmt(total)}`,
        `المدفوع: MAD ${fmt(paid)}`,
      ].filter(Boolean).join("\n");
      await Share.share({ message: text, title: `فاتورة #${params.invoiceNumber}` });
    } catch {
      Toast.show("تعذر مشاركة الفاتورة", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: D.rose,
      });
    }
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)/sales");
  }

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <View style={[S.navRow, { paddingTop: topInset + 10 }]}>
          <TouchableOpacity style={S.hBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={S.navTitle}>{isPreview ? "Aperçu facture" : "Facture"}</Text>
          <TouchableOpacity style={S.doneBtn} onPress={handleDone}>
            <Text style={S.doneBtnTxt}>Terminer</Text>
          </TouchableOpacity>
        </View>

        {/* Status chip */}
        <View style={S.statusRow}>
          <View style={[S.statusPill, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={S.invoiceNumTxt}>#{params.invoiceNumber}</Text>
          </View>
          <View style={[S.statusPill, { backgroundColor: statusBg, borderColor: statusColor + "40" }]}>
            <View style={[S.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[S.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* ── Scroll body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, paddingBottom: 130 }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            THERMAL INVOICE — black on white only, no colours in body
            80mm thermal printer safe
        ════════════════════════════════════════════════════════════════════ */}
        <View style={S.invoice}>

          {/* Logo */}
          <View style={S.invoiceLogoArea}>
            <Image
              source={require("../../assets/flurry-logo.png")}
              style={S.invoiceLogo}
              resizeMode="contain"
            />
          </View>

          {/* ── Divider ── */}
          <View style={S.thermDividerDashed} />

          {/* Invoice title + number */}
          <Text style={S.invoiceTitle}>FACTURE #{params.invoiceNumber}</Text>

          {/* Meta block */}
          <View style={S.thermMeta}>
            <View style={S.thermMetaRow}>
              <Text style={S.thermMetaLbl}>Date</Text>
              <Text style={S.thermMetaVal}>{dateStr}</Text>
            </View>
            <View style={S.thermMetaRow}>
              <Text style={S.thermMetaLbl}>Vendeur</Text>
              <Text style={S.thermMetaVal}>{params.vendeur || user}</Text>
            </View>
            <View style={S.thermMetaRow}>
              <Text style={S.thermMetaLbl}>Règlement</Text>
              <Text style={S.thermMetaVal}>{params.paymentMethod}</Text>
            </View>
          </View>

          <View style={S.thermDividerSolid} />

          {/* Bill-to */}
          <View style={S.thermBillTo}>
            <Text style={S.thermBillToLbl}>FACTURÉ À</Text>
            <Text style={S.thermBillToName}>{params.customerName}</Text>
            {params.customerPhone ? (
              <Text style={S.thermBillToPhone}>{params.customerPhone}</Text>
            ) : null}
          </View>

          <View style={S.thermDividerSolid} />

          {/* Items table header */}
          <View style={S.thermTableHeader}>
            <Text style={[S.thermTh, { flex: 3, textAlign: "left" }]}>ARTICLE</Text>
            <Text style={[S.thermTh, { flex: 1, textAlign: "center" }]}>QTÉ</Text>
            <Text style={[S.thermTh, { flex: 1.5, textAlign: "right" }]}>P.U.</Text>
            <Text style={[S.thermTh, { flex: 1.5, textAlign: "right" }]}>TOTAL</Text>
          </View>
          <View style={S.thermDividerSolid} />

          {/* Items */}
          {items.map((item, i) => (
            <View key={i} style={[S.thermTableRow, i % 2 === 1 && S.thermTableRowAlt]}>
              <Text style={[S.thermTd, { flex: 3, textAlign: "left" }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[S.thermTd, { flex: 1, textAlign: "center" }]}>{item.qty}</Text>
              <Text style={[S.thermTd, { flex: 1.5, textAlign: "right" }]}>{fmt(item.price)}</Text>
              <Text style={[S.thermTdBold, { flex: 1.5, textAlign: "right" }]}>
                {fmt(item.qty * item.price)}
              </Text>
            </View>
          ))}

          <View style={S.thermDividerSolid} />

          {/* Subtotals */}
          <View style={S.thermSummary}>
            <View style={S.thermSummaryRow}>
              <Text style={S.thermSummaryLbl}>Sous-total</Text>
              <Text style={S.thermSummaryVal}>MAD {fmt(subtotal)}</Text>
            </View>

            {discountPct > 0 && (
              <View style={S.thermSummaryRow}>
                <Text style={S.thermSummaryLbl}>Remise ({discountPct}%)</Text>
                <Text style={S.thermSummaryVal}>- MAD {fmt(subtotal * discountPct / 100)}</Text>
              </View>
            )}

            {returnAmt > 0 && (
              <View style={S.thermSummaryRow}>
                <Text style={S.thermSummaryLbl}>Retour marchandise</Text>
                <Text style={S.thermSummaryVal}>- MAD {fmt(returnAmt)}</Text>
              </View>
            )}
            {/* Grand total */}
            <View style={S.thermTotal}>
              <Text style={S.thermTotalLbl}>TOTAL NET</Text>
              <Text style={S.thermTotalVal}>MAD {fmt(total)}</Text>
            </View>

            

            <View style={S.thermSummaryRow}>
              <Text style={S.thermSummaryLbl}>Payé</Text>
              <Text style={S.thermSummaryVal}>MAD {fmt(paid)}</Text>
            </View>

            {remaining > 0 && (
              <View style={S.thermSummaryRow}>
                <Text style={S.thermSummaryLbl}>Reste à payer</Text>
                <Text style={S.thermSummaryValBold}>MAD {fmt(remaining)}</Text>
              </View>
            )}
          </View>



          <View style={S.thermDividerDashed} />

          {/* QR code */}
          <View style={S.thermQrArea}>
            <QRCode value={qrData} size={100} color="#000" backgroundColor="#fff" />
            <Text style={S.thermQrTxt}>Scannez pour vérifier la facture</Text>
          </View>

          <View style={S.thermDividerDashed} />

          {/* Footer thank-you */}
          <Text style={S.thermFooter}>Merci pour votre confiance!</Text>
        </View>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {/* Print button */}
        <TouchableOpacity
          style={[
            S.printBtn,
            (isConnecting || isPrinting) && S.printBtnLoading,
            isSuccess && S.printBtnSuccess,
            !!error && S.printBtnError,
          ]}
          onPress={async () => {
            if (isConnecting || isPrinting) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
            await print(sale);
          }}
          disabled={isConnecting || isPrinting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              isSuccess ? ["#1a6b3c", D.emerald] :
                error ? [D.rose, "#c0392b"] :
                  (isConnecting || isPrinting) ? [D.inkSoft, D.inkMid] :
                    [D.heroA, D.heroAccent]
            }
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.printBtnInner}
          >
            {isConnecting || isPrinting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isSuccess ? (
              <Feather name="check" size={17} color="#fff" />
            ) : error ? (
              <Feather name="alert-circle" size={17} color="#fff" />
            ) : (
              <Feather name="printer" size={17} color="#fff" />
            )}
            <Text style={S.printBtnTxt}>
              {isConnecting ? "Connexion..." :
                isPrinting ? "Impression..." :
                  isSuccess ? "Imprimé!" :
                    error ? "Erreur" :
                      "Imprimer"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Retry */}
        {error && (
          <TouchableOpacity
            style={S.retryBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); retry(); }}
            activeOpacity={0.85}
          >
            <Feather name="refresh-cw" size={16} color={D.rose} />
            <Text style={S.retryBtnTxt}>Réessayer</Text>
          </TouchableOpacity>
        )}

        {/* Share */}
        <TouchableOpacity style={S.shareBtn} onPress={handleShare} activeOpacity={0.85}>
          <Feather name="share-2" size={17} color={D.heroAccent} />
          <Text style={S.shareBtnTxt}>Partager</Text>
        </TouchableOpacity>
      </View>

      {/* Print Modal */}
      <Modal visible={showPrintModal} transparent animationType="fade" statusBarTranslucent>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            {state === 'queued' ? (
              <>
                <View style={[S.modalIcon, { backgroundColor: D.amberBg }]}>
                  <Feather name="clock" size={32} color={D.amber} />
                </View>
                <Text style={S.modalTitle}>En attente</Text>
                <Text style={S.modalSubtitle}>{error || "Impression enregistrée"}</Text>
                <TouchableOpacity style={S.modalBtn} onPress={() => setShowPrintModal(false)}>
                  <Text style={S.modalBtnTxt}>OK</Text>
                </TouchableOpacity>
              </>
            ) : isConnecting || isPrinting ? (
              <>
                <ActivityIndicator size="large" color={D.heroAccent} />
                <Text style={S.modalTitle}>Impression...</Text>
                <Text style={S.modalSubtitle}>Veuillez patienter</Text>
              </>
            ) : isSuccess ? (
              <>
                <View style={[S.modalIcon, { backgroundColor: D.emeraldBg }]}>
                  <Feather name="check" size={32} color={D.emerald} />
                </View>
                <Text style={S.modalTitle}>Imprimé!</Text>
                <TouchableOpacity style={S.modalBtn} onPress={() => setShowPrintModal(false)}>
                  <Text style={S.modalBtnTxt}>OK</Text>
                </TouchableOpacity>
              </>
            ) : error ? (
              <>
                <View style={[S.modalIcon, { backgroundColor: D.roseBg }]}>
                  <Feather name="alert-circle" size={32} color={D.rose} />
                </View>
                <Text style={S.modalTitle}>Erreur</Text>
                <Text style={S.modalSubtitle}>{error}</Text>
                <View style={S.modalBtnRow}>
                  <TouchableOpacity 
                    style={[S.modalBtn, S.modalBtnCancel]} 
                    onPress={() => setShowPrintModal(false)}
                  >
                    <Text style={S.modalBtnCancelTxt}>Fermer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[S.modalBtn, S.modalBtnRetry]} 
                    onPress={() => { setShowPrintModal(false); retry(); }}
                  >
                    <Text style={S.modalBtnTxt}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroAccent, opacity: 0.1, top: -50, right: -50 },
  blob2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 0, left: -20 },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: -0.3 },
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  doneBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  doneBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  invoiceNumTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)" },

  // ── Thermal invoice wrapper ──────────────────────────────────────────────
  // White card — simulates the paper receipt
  invoice: {
    backgroundColor: T.bg,
    borderRadius: 6,
    padding: 20,
    elevation: 6,
    shadowColor: "rgba(0,0,0,0.18)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 10,
  },

  // Logo centred
  invoiceLogoArea: { alignItems: "center", marginBottom: 10 },
  invoiceLogo: { width: 140, height: 70 },

  // Title
  invoiceTitle: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: T.ink, textAlign: "center",
    letterSpacing: 1, marginVertical: 10,
  },

  // Dividers
  thermDividerSolid: { height: 1, backgroundColor: T.divider, marginVertical: 8 },
  thermDividerDashed: {
    height: 1, borderWidth: 1, borderStyle: "dashed",
    borderColor: T.divider, marginVertical: 8,
  },

  // Meta rows
  thermMeta: { gap: 4 },
  thermMetaRow: { flexDirection: "row", justifyContent: "space-between" },
  thermMetaLbl: { fontSize: 11, fontFamily: "Inter_400Regular", color: T.inkLight },
  thermMetaVal: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: T.ink },

  // Bill-to
  thermBillTo: { gap: 3, marginVertical: 2 },
  thermBillToLbl: { fontSize: 10, fontFamily: "Inter_700Bold", color: T.ink, letterSpacing: 1 },
  thermBillToName: { fontSize: 13, fontFamily: "Inter_700Bold", color: T.ink },
  thermBillToPhone: { fontSize: 11, fontFamily: "Inter_400Regular", color: T.inkLight },

  // Table
  thermTableHeader: { flexDirection: "row", paddingVertical: 4 },
  thermTh: { fontSize: 10, fontFamily: "Inter_700Bold", color: T.ink, letterSpacing: 0.5 },

  thermTableRow: { flexDirection: "row", paddingVertical: 5 },
  thermTableRowAlt: { backgroundColor: "#F8F8F8" },
  thermTd: { fontSize: 11, fontFamily: "Inter_400Regular", color: T.ink },
  thermTdBold: { fontSize: 11, fontFamily: "Inter_700Bold", color: T.ink },

  // Summary
  thermSummary: { gap: 5, paddingVertical: 4 },
  thermSummaryRow: { flexDirection: "row", justifyContent: "space-between" },
  thermSummaryLbl: { fontSize: 11, fontFamily: "Inter_400Regular", color: T.inkLight },
  thermSummaryVal: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: T.ink },
  thermSummaryValBold: { fontSize: 12, fontFamily: "Inter_700Bold", color: T.ink },

  // Grand total
  thermTotal: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, marginVertical: 4,
    borderTopWidth: 2, borderBottomWidth: 2, borderColor: T.ink,
  },
  thermTotalLbl: { fontSize: 14, fontFamily: "Inter_700Bold", color: T.ink, letterSpacing: 1 },
  thermTotalVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: T.ink },

  // QR
  thermQrArea: { alignItems: "center", gap: 8, marginVertical: 4 },
  thermQrTxt: { fontSize: 10, fontFamily: "Inter_400Regular", color: T.inkLight, textAlign: "center" },

  // Footer
  thermFooter: { fontSize: 11, fontFamily: "Inter_500Medium", color: T.inkLight, textAlign: "center", marginTop: 4 },

  // ── Bottom bar ───────────────────────────────────────────────────────────
  bottomBar: {
    backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border,
    paddingHorizontal: 14, paddingTop: 12, flexDirection: "row", gap: 10,
    elevation: 4, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 1, shadowRadius: 6,
  },

  printBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  printBtnLoading: { opacity: 0.7 },
  printBtnSuccess: {},
  printBtnError: {},
  printBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52 },
  printBtnTxt: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: D.roseBg, borderRadius: 14, height: 52, paddingHorizontal: 14,
    borderWidth: 1, borderColor: D.rose + "50",
  },
  retryBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.rose },

  shareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: D.violetBg, borderRadius: 14, height: 52,
    borderWidth: 1.5, borderColor: D.heroAccent + "40",
  },
  shareBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.heroAccent },

  errorBanner: {
    position: "absolute", left: 16, right: 16,
    backgroundColor: D.rose, borderRadius: 14,
    padding: 12, flexDirection: "row", alignItems: "center", gap: 8,
    elevation: 8,
  },
  errorBannerTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#fff" },

  // Print Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: D.surface, borderRadius: 20, padding: 32, alignItems: "center", width: "80%", maxWidth: 300 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: D.ink, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: D.inkSoft, textAlign: "center", marginBottom: 20 },
  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { backgroundColor: D.bg, borderWidth: 1, borderColor: D.border },
  modalBtnCancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.inkSoft },
  modalBtnRetry: { backgroundColor: D.heroAccent },
  modalBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});