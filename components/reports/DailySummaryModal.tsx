import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { DailySummaryData } from "@/hooks/usePrintInvoice";

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:         "#F7F6F2",
  surface:    "#FFFFFF",
  heroA:      "#1C1C2E",
  heroB:      "#2D2B55",
  heroAccent: "#6C63FF",
  ink:        "#111118",
  inkMid:     "#3D3C52",
  inkSoft:    "#8B8AA5",
  inkGhost:   "#C4C3D0",
  emerald:    "#00B37D",
  emeraldBg:  "#E6FAF4",
  rose:       "#F04E6A",
  roseBg:     "#FEE9ED",
  amber:      "#F59E0B",
  amberBg:    "#FEF3C7",
  violet:     "#8B5CF6",
  violetBg:   "#F5F3FF",
  border:     "#ECEAE4",
  shadow:     "rgba(17,17,24,0.08)",
  overlay:    "rgba(17,17,24,0.55)",
};

// ── Receipt color tokens (black-only for thermal) ─────────────────────────────
const R = {
  bg:      "#FFFFFF",
  ink:     "#000000",
  inkSoft: "#444444",
  divider: "#CCCCCC",
};

function fmtAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export type { DailySummaryData };

// ── Props ─────────────────────────────────────────────────────────────────────
interface DailySummaryModalProps {
  visible: boolean;
  data: DailySummaryData;
  isPrinting: boolean;
  isConnecting: boolean;
  isSuccess: boolean;
  printerName?: string | null;
  onPrint: () => void;
  onClose: () => void;
}

// ── Receipt Row ───────────────────────────────────────────────────────────────
function ReceiptRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={RS.row}>
      <Text
        style={[RS.label, bold && RS.bold, color ? { color } : undefined]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[RS.value, bold && RS.bold, color ? { color } : undefined]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const RS = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: R.inkSoft,
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: R.ink,
    textAlign: "right",
  },
  bold: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider({ dashed }: { dashed?: boolean }) {
  if (dashed) {
    return (
      <View style={DS.dashed}>
        {"- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - "
          .split("")
          .map((c, i) => (
            <Text key={i} style={DS.dash}>
              {c}
            </Text>
          ))}
      </View>
    );
  }
  return <View style={DS.solid} />;
}

const DS = StyleSheet.create({
  solid: {
    height: 1,
    backgroundColor: R.divider,
    marginVertical: 4,
  },
  dashed: {
    flexDirection: "row",
    overflow: "hidden",
    marginVertical: 4,
  },
  dash: {
    fontSize: 10,
    color: R.divider,
    lineHeight: 14,
  },
});

// ── Main Modal ────────────────────────────────────────────────────────────────
export function DailySummaryModal({
  visible,
  data,
  isPrinting,
  isConnecting,
  isSuccess,
  printerName,
  onPrint,
  onClose,
}: DailySummaryModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const today = formatDate(new Date());
  const isBusy = isPrinting || isConnecting;

  // Get filtered sales based on client filter
  const filteredSales = React.useMemo(() => {
    if (!data.sales || data.sales.length === 0) return [];
    if (!data.clientFilter) return data.sales;
    return data.sales.filter(s => (s.customerName || '').toLowerCase() === (data.clientFilter || '').toLowerCase());
  }, [data.sales, data.clientFilter]);

  const handlePrint = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrint();
  }, [onPrint]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return t("reports.paid");
      case 'partial': return t("reports.partial");
      case 'due': return t("reports.due");
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return D.emerald;
      case 'partial': return D.amber;
      case 'due': return D.rose;
      default: return D.inkSoft;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={S.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Sheet */}
      <View
        style={[S.sheet, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* Handle */}
        <View style={S.handle} />

        {/* Sheet header */}
        <View style={S.sheetHeader}>
          <View style={S.sheetTitleRow}>
            <View style={S.sheetIconWrap}>
              <Feather name="printer" size={18} color={D.heroAccent} />
            </View>
            <Text style={S.sheetTitle}>Aperçu avant impression</Text>
          </View>
          <TouchableOpacity
            style={S.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={18} color={D.inkSoft} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={S.scrollContent}
        >
          {/* ── Receipt preview ── */}
          <View style={S.receipt}>
            {/* Logo / title */}
            <Text style={S.receiptTitle}>RÉSUMÉ JOURNALIER</Text>
            <Text style={S.receiptSubTitle}>RAPPORT VENDEUR</Text>

            <Divider />

            {/* Meta info */}
            <View style={S.receiptMeta}>
              <Text style={S.metaText}>Date : {today}</Text>
              <Text style={S.metaText}>Période : {data.periodLabel}</Text>
              {data.vendorName ? (
                <Text style={S.metaText}>Vendeur : {data.vendorName}</Text>
              ) : null}
              {data.truckLabel ? (
                <Text style={S.metaText}>Camion : {data.truckLabel}</Text>
              ) : null}
            </View>

            <Divider dashed />

            {/* Main metrics */}
            <ReceiptRow
              label="Total ventes"
              value={`${fmtAmount(data.totalSales)} MAD`}
            />
            <ReceiptRow
              label="Total encaissé"
              value={`${fmtAmount(data.cashCollected)} MAD`}
              color={D.emerald}
            />
            <ReceiptRow
              label="Crédit clients"
              value={`${fmtAmount(data.customerCredit)} MAD`}
              color={data.customerCredit > 0 ? D.rose : D.inkSoft}
            />

            <Divider dashed />

            <ReceiptRow
              label="Stock restant (valeur)"
              value={`${fmtAmount(data.stockValue)} MAD`}
              color={D.violet}
            />

            <Divider />

            {/* Total invoices */}
            <ReceiptRow
              label="Nb. de factures"
              value={`${data.salesCount}`}
              bold
            />

            <Divider dashed />

            {/* Sales Details */}
            {filteredSales.length > 0 && (
              <>
                <View style={S.salesDetailsHeader}>
                  <Text style={S.salesDetailsTitle}>{t("reports.salesDetails")}</Text>
                  <Text style={S.salesDetailsCount}>({filteredSales.length})</Text>
                </View>
                <Divider />
                
                {/* Sales header */}
                <View style={S.salesRowHeader}>
                  <Text style={[S.salesCellHeader, S.salesCellInvoice]}>#</Text>
                  <Text style={[S.salesCellHeader, S.salesCellCustomer]}>{t("reports.customer")}</Text>
                  <Text style={[S.salesCellHeader, S.salesCellAmount]}>{t("reports.amount")}</Text>
                  <Text style={[S.salesCellHeader, S.salesCellStatus]}>{t("reports.status")}</Text>
                </View>
                <Divider />
                
                {/* Sales rows */}
                {filteredSales.slice(0, 10).map((sale, index) => (
                  <View key={sale.id || index} style={S.salesRow}>
                    <Text style={[S.salesCell, S.salesCellInvoice]}>#{String(sale.invoiceNumber || sale.id).slice(0, 6)}</Text>
                    <Text style={[S.salesCell, S.salesCellCustomer]} numberOfLines={1}>
                      {sale.customerName || '-'}
                    </Text>
                    <Text style={[S.salesCell, S.salesCellAmount]}>
                      {fmtAmount(sale.amount)}
                    </Text>
                    <View style={[S.statusBadge, { backgroundColor: getStatusColor(sale.status) + '20' }]}>
                      <Text style={[S.statusBadgeText, { color: getStatusColor(sale.status) }]}>
                        {getStatusLabel(sale.status)}
                      </Text>
                    </View>
                  </View>
                ))}
                
                {filteredSales.length > 10 && (
                  <Text style={S.salesMore}>
                    +{filteredSales.length - 10} {t("reports.more") || "autres"}
                  </Text>
                )}
                <Divider />
              </>
            )}

            {/* Footer */}
            <Text style={S.receiptFooter}>
              Généré le {today} · BizPOS
            </Text>
          </View>

          {/* Printer status */}
          {printerName ? (
            <View style={S.printerBadge}>
              <Feather name="bluetooth" size={13} color={D.emerald} />
              <Text style={S.printerBadgeTxt}>{printerName}</Text>
            </View>
          ) : (
            <View style={[S.printerBadge, S.printerBadgeWarn]}>
              <Feather name="alert-circle" size={13} color={D.amber} />
              <Text style={[S.printerBadgeTxt, { color: D.amber }]}>
                Aucune imprimante connectée
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Action buttons ── */}
        <View style={S.actions}>
          <TouchableOpacity
            style={S.cancelBtn}
            onPress={handleClose}
            disabled={isBusy}
          >
            <Text style={S.cancelTxt}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.printBtn, isBusy && S.printBtnBusy]}
            onPress={handlePrint}
            disabled={isBusy}
            activeOpacity={0.82}
          >
            {isBusy ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={S.printTxt}>
                  {isConnecting ? "Connexion…" : "Impression…"}
                </Text>
              </>
            ) : isSuccess ? (
              <>
                <Feather name="check" size={16} color="#FFFFFF" />
                <Text style={S.printTxt}>Imprimé !</Text>
              </>
            ) : (
              <>
                <Feather name="printer" size={16} color="#FFFFFF" />
                <Text style={S.printTxt}>Imprimer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: D.overlay,
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "85%",
    backgroundColor: D.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.inkGhost,
    alignSelf: "center",
    marginBottom: 16,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: D.violetBg,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingBottom: 8,
    gap: 12,
  },

  // Receipt card
  receipt: {
    backgroundColor: R.bg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: D.border,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: R.ink,
    textAlign: "center",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  receiptSubTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: R.inkSoft,
    textAlign: "center",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 2,
  },
  receiptMeta: {
    gap: 3,
    marginVertical: 6,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: R.inkSoft,
  },
  receiptFooter: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: R.inkSoft,
    textAlign: "center",
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Printer badge
  printerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: D.emeraldBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: D.emerald + "40",
  },
  printerBadgeWarn: {
    backgroundColor: D.amberBg,
    borderColor: D.amber + "40",
  },
  printerBadgeTxt: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: D.emerald,
  },

  // Action buttons
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: D.surface,
  },
  cancelTxt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  printBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: D.heroAccent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: D.heroAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  printBtnBusy: {
    backgroundColor: D.inkSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  printTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  // Sales Details
  salesDetailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 4,
  },
  salesDetailsTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: R.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  salesDetailsCount: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: R.inkSoft,
  },
  salesRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  salesCellHeader: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: R.inkSoft,
    textTransform: "uppercase",
  },
  salesCellInvoice: { width: 45 },
  salesCellCustomer: { flex: 1 },
  salesCellAmount: { width: 55, textAlign: "right" },
  salesCellStatus: { width: 45, textAlign: "right" },
  salesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  salesCell: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: R.ink,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 7,
    fontFamily: "Inter_600SemiBold",
  },
  salesMore: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: R.inkSoft,
    textAlign: "center",
    marginTop: 4,
  },
});
