import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Toast from "react-native-root-toast";
import { useFuel } from "@/context/FuelContext";
import { FuelEntry } from "@/context/AppContext";
import { usePrintInvoice, LOGO_B64 } from "@/hooks/usePrintInvoice";
import { D } from "@/constants/theme";
import { Colors } from "@/constants";
import { calcAvgConsumption, calcKmDriven, calcAvgPricePerLiter } from "@/utils/fuel";

const FUEL_PRIMARY = "#1a3a2a";
const FUEL_ACCENT = "#22c55e";

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface FuelSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  filteredEntries?: FuelEntry[];
  monthLabel?: string;
}

export function FuelSummaryModal({ visible, onClose, filteredEntries, monthLabel: monthLabelProp }: FuelSummaryModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries } = useFuel();
  const { printFuelReceipt, isConnecting, isPrinting, isSuccess } = usePrintInvoice();

  const now = new Date();

  const defaultMonthEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [entries]);

  const displayEntries = filteredEntries ?? defaultMonthEntries;

  const monthlyTotals = useMemo(() => {
    const totalLiters = displayEntries.reduce((sum, e) => sum + e.liters, 0);
    const totalCost = displayEntries.reduce((sum, e) => sum + e.totalCost, 0);
    const avgConsumption = calcAvgConsumption(displayEntries);
    return { totalLiters, totalCost, avgConsumption };
  }, [displayEntries]);

  const monthLabel = monthLabelProp ?? now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const isBusy = isPrinting || isConnecting;

  const onPrint = useCallback(async () => {
    await printFuelReceipt(displayEntries, monthLabel);
  }, [printFuelReceipt, displayEntries, monthLabel]);

  const onShare = useCallback(async () => {
    try {
      const totalLiters = displayEntries.reduce((sum, e) => sum + e.liters, 0);
      const totalCost = displayEntries.reduce((sum, e) => sum + e.totalCost, 0);
      const avgConsumption = calcAvgConsumption(displayEntries);
      const avgPrice = calcAvgPricePerLiter(displayEntries);
      const kmDriven = calcKmDriven(displayEntries);
      const sortedEntries = [...displayEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const entriesRows = sortedEntries.map(e => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${new Date(e.date).toLocaleDateString("fr-FR")}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;">${e.station || "-"}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${e.liters.toFixed(2)} L</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${e.pricePerLiter.toFixed(2)} MAD</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(e.totalCost)} MAD</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${e.odometer.toLocaleString()} km</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${e.consumption ? e.consumption.toFixed(1) + " L/100km" : "-"}</td>
        </tr>`).join("");

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=595"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:595px;margin:0 auto;}
    .header{text-align:center;margin-bottom:20px;padding:20px;background:#1a3a2a;border-radius:10px;}
    .logo-img{max-width:140px;max-height:80px;margin-bottom:10px;}
    .brand{font-size:28px;font-weight:900;color:#fff;margin:0;}
    .tagline{font-size:12px;color:rgba(255,255,255,0.8);margin:6px 0 0 0;}
    .title{font-size:18px;font-weight:700;color:#22c55e;margin:20px 0 16px 0;text-align:center;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
    .info-card{background:#f8f8ff;padding:14px;border-radius:10px;border:1px solid #e0e0e0;}
    .info-label{font-size:11px;color:#666;margin-bottom:4px;}
    .info-value{font-size:18px;font-weight:700;color:#1a3a2a;}
    .info-unit{font-size:11px;color:#888;margin-left:4px;}
    table{width:100%;border-collapse:collapse;font-size:11px;margin:16px 0;}
    th{background:#f0f0f0;padding:10px 8px;text-align:left;font-weight:700;border-bottom:2px solid #ddd;font-size:10px;color:#333;}
    th:nth-child(3),th:nth-child(4),th:nth-child(6),th:nth-child(7){text-align:center;}
    th:nth-child(5){text-align:right;}
    .summary-box{background:#1a3a2a;padding:16px;border-radius:10px;margin-top:20px;}
    .summary-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.2);}
    .summary-row:last-child{border-bottom:none;}
    .summary-label{color:rgba(255,255,255,0.8);font-size:13px;}
    .summary-value{color:#fff;font-weight:700;font-size:15px;}
    .footer{text-align:center;margin-top:30px;padding-top:16px;border-top:2px solid #1a3a2a;}
    .footer-text{font-size:11px;color:#666;}
    .footer-small{font-size:9px;color:#aaa;margin-top:4px;}
  </style>
</head>
<body>
  <div class="header">
    <img class="logo-img" src="${LOGO_B64}" alt="FlurryIce Logo" />
    <h1 class="brand">FLURRYICE</h1>
    <p class="tagline">Rapport Carburant - ${monthLabel}</p>
  </div>
  
  <h2 class="title">DÉTAILS DES REMPLISSAGES</h2>
  
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Total Litres</div>
      <div class="info-value">${totalLiters.toFixed(2)}<span class="info-unit">L</span></div>
    </div>
    <div class="info-card">
      <div class="info-label">Coût Total</div>
      <div class="info-value">${fmt(totalCost)}<span class="info-unit">MAD</span></div>
    </div>
    <div class="info-card">
      <div class="info-label">Prix Moyen / Litre</div>
      <div class="info-value">${avgPrice.toFixed(2)}<span class="info-unit">MAD</span></div>
    </div>
    <div class="info-card">
      <div class="info-label">Consommation Moyenne</div>
      <div class="info-value">${avgConsumption > 0 ? avgConsumption.toFixed(1) : "--"}<span class="info-unit">L/100km</span></div>
    </div>
    <div class="info-card">
      <div class="info-label">Km Parcourus</div>
      <div class="info-value">${kmDriven.toLocaleString()}<span class="info-unit">km</span></div>
    </div>
    <div class="info-card">
      <div class="info-label">Nb. Remplissages</div>
      <div class="info-value">${displayEntries.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Station</th>
        <th>Litres</th>
        <th>Prix/L</th>
        <th>Total</th>
        <th>Kilométrage</th>
        <th>L/100km</th>
      </tr>
    </thead>
    <tbody>${entriesRows}</tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span class="summary-label">Total Carburant</span>
      <span class="summary-value">${fmt(totalCost)} MAD</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Litres Consommés</span>
      <span class="summary-value">${totalLiters.toFixed(2)} L</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Km Parcourus ce Mois</span>
      <span class="summary-value">${kmDriven.toLocaleString()} km</span>
    </div>
  </div>

  <div class="footer">
    <p class="footer-text">Généré par BizPOS - ${new Date().toLocaleDateString("fr-FR")}</p>
    <p class="footer-small">Camion 01 - FlurryIce</p>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Rapport Carburant - " + monthLabel });
      }
    } catch (e) {
      console.error("PDF share error:", e);
      Toast.show("Erreur lors de l'export PDF", { duration: 2000, backgroundColor: D.rose });
    }
  }, [displayEntries, monthLabel]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={S.backdrop}>
        <View style={[S.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={S.handle} />
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={S.title}>{t("fuel.monthlySummary")}</Text>
            <Text style={S.subtitle}>{monthLabel}</Text>

            {/* Summary Cards */}
            <View style={S.metricsGrid}>
              <View style={[S.metricCard, { backgroundColor: FUEL_PRIMARY }]}>
                <Text style={S.metricValue}>{monthlyTotals.totalLiters.toFixed(1)}</Text>
                <Text style={S.metricLabel}>{t("fuel.liters")}</Text>
              </View>
              <View style={[S.metricCard, { backgroundColor: D.emerald }]}>
                <Text style={S.metricValue}>{fmt(monthlyTotals.totalCost)}</Text>
                <Text style={S.metricLabel}>MAD</Text>
              </View>
              <View style={[S.metricCard, { backgroundColor: D.amber }]}>
                <Text style={S.metricValue}>
                  {monthlyTotals.avgConsumption > 0 ? monthlyTotals.avgConsumption.toFixed(1) : "--"}
                </Text>
                <Text style={S.metricLabel}>L/100km</Text>
              </View>
            </View>

            {/* Entries Table */}
            {displayEntries.length > 0 && (
              <View style={S.tableContainer}>
                <Text style={S.sectionTitle}>{t("fuel.fillUps")}</Text>
                {displayEntries.map((entry, index) => (
                  <View key={entry.id} style={[S.tableRow, index > 0 && S.tableRowBorder]}>
                    <View style={S.tableCell}>
                      <Text style={S.tableDate}>
                        {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </Text>
                      <Text style={S.tableStation}>{entry.station || "-"}</Text>
                    </View>
                    <View style={S.tableCell}>
                      <Text style={S.tableValue}>{entry.liters.toFixed(1)} L</Text>
                      <Text style={S.tablePrice}>{fmt(entry.pricePerLiter)}/L</Text>
                    </View>
                    <View style={S.tableCell}>
                      <Text style={S.tableTotal}>MAD {fmt(entry.totalCost)}</Text>
                      <Text style={S.tableKm}>{entry.odometer.toLocaleString()} km</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Action buttons */}
            <View style={S.actions}>
              <TouchableOpacity style={S.cancelBtn} onPress={onClose} disabled={isBusy}>
                <Text style={S.cancelTxt}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={S.shareBtn} onPress={onShare} disabled={isBusy}>
                <Feather name="share" size={16} color={FUEL_ACCENT} />
                <Text style={S.shareTxt}>PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.printBtn, isBusy && S.printBtnBusy]}
                onPress={onPrint}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isSuccess ? (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={S.printTxt}>OK</Text>
                  </>
                ) : (
                  <>
                    <Feather name="printer" size={16} color="#fff" />
                    <Text style={S.printTxt}>{t("common.print")}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: D.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: D.inkSoft,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  metricLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  tableContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  tableRowBorder: {
    borderTopWidth: 1,
    borderTopColor: D.border,
  },
  tableCell: {
    flex: 1,
  },
  tableDate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: D.ink,
  },
  tableStation: {
    fontSize: 11,
    color: D.inkSoft,
    marginTop: 2,
  },
  tableValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    textAlign: "center",
  },
  tablePrice: {
    fontSize: 11,
    color: D.inkSoft,
    textAlign: "center",
    marginTop: 2,
  },
  tableTotal: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: FUEL_ACCENT,
    textAlign: "right",
  },
  tableKm: {
    fontSize: 11,
    color: D.inkSoft,
    textAlign: "right",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  shareBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: FUEL_ACCENT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: D.surface,
    flexDirection: "row",
    gap: 6,
  },
  shareTxt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: FUEL_ACCENT,
  },
  printBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: FUEL_PRIMARY,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  printBtnBusy: {
    backgroundColor: D.inkSoft,
  },
  printTxt: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
