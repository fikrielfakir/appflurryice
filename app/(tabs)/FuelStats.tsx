import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import Toast from "react-native-root-toast";
import { useFuel } from "@/context/FuelContext";
import { useApp, FuelEntry } from "@/context/AppContext";
import { D } from "@/constants/theme";
import { calcMonthConsumption } from "@/utils/fuel";

const FUEL_PRIMARY = "#1a3a2a";
const FUEL_ACCENT = "#22c55e";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 64;
const BAR_WIDTH = 40;

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MonthData {
  month: string;
  liters: number;
  cost: number;
  consumption: number;
}

interface FuelStatsProps {
  filteredEntries?: FuelEntry[];
}

export function FuelStats({ filteredEntries }: FuelStatsProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries, budget } = useFuel();
  const { userProfile } = useApp();

  const now = useMemo(() => new Date(), []);
  const sourceEntries = filteredEntries ?? entries;

  const last6Months = useMemo((): MonthData[] => {
    const months: MonthData[] = [];
    const allSorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEntries = sourceEntries.filter(e => {
        const ed = new Date(e.date);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      });

      const totalLiters = monthEntries.reduce((sum, e) => sum + e.liters, 0);
      const totalCost = monthEntries.reduce((sum, e) => sum + e.totalCost, 0);

      const prevEntries = allSorted.filter(e => new Date(e.date) < d);
      const prevLast = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : undefined;

      const avgConsumption = calcMonthConsumption(monthEntries, prevLast);

      months.push({
        month: d.toLocaleDateString("fr-FR", { month: "short" }),
        liters: totalLiters,
        cost: totalCost,
        consumption: avgConsumption,
      });
    }

    return months;
  }, [entries, sourceEntries, now]);

  const currentMonthData = last6Months[5];
  const prevMonthData = last6Months[4];

  const maxLiters = Math.max(...last6Months.map(m => m.liters), 100);

  const efficiencyStatus = useMemo(() => {
    if (!currentMonthData?.consumption || !prevMonthData?.consumption) return "neutral";
    const diff = currentMonthData.consumption - prevMonthData.consumption;
    if (diff < -1) return "good";
    if (diff > 1) return "bad";
    return "neutral";
  }, [currentMonthData, prevMonthData]);

  const handleExportPdf = async () => {
    try {
      const today = new Date().toLocaleDateString("fr-MA", {
        day: "2-digit", month: "long", year: "numeric",
      });

      const rows = last6Months.map(m => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${m.month}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${m.liters.toFixed(1)} L</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${fmt(m.cost)} MAD</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${m.consumption > 0 ? m.consumption.toFixed(1) + " L/100km" : "-"}</td>
        </tr>
      `).join("");

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=595"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:595px;margin:0 auto;}
    .header{text-align:center;margin-bottom:24px;padding:16px;background:#1a3a2a;border-radius:8px;}
    .brand{font-size:24px;font-weight:900;color:#fff;margin:0;}
    .tagline{font-size:10px;color:rgba(255,255,255,0.8);margin:4px 0 0 0;}
    .title{font-size:16px;font-weight:700;color:#22c55e;margin:20px 0 12px 0;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#f0f0f0;padding:10px;text-align:left;font-weight:600;border-bottom:2px solid #ddd;}
    td{padding:10px;border-bottom:1px solid #eee;}
    .footer{text-align:center;margin-top:30px;font-size:10px;color:#888;}
  </style>
</head>
<body>
  <div class="header">
    <h1 class="brand">FLURRYICE</h1>
    <p class="tagline">Point de vente - Gestion Carburant</p>
  </div>
  <h2 class="title">STATISTIQUES CARBURANT</h2>
  <table>
    <thead>
      <tr>
        <th>Mois</th>
        <th style="text-align:right;">Litres</th>
        <th style="text-align:right;">Coût (MAD)</th>
        <th style="text-align:right;">Consommation</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <p>Généré le ${today} - Powered by BizPOS</p>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Statistiques Carburant" });
      }
    } catch (e) {
      console.error("PDF export error:", e);
      Toast.show("Erreur lors de l'export PDF", { duration: 2000, backgroundColor: D.rose });
    }
  };

  return (
    <ScrollView style={S.container} showsVerticalScrollIndicator={false}>
      {/* Bar Chart */}
      <View style={S.section}>
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>{t("fuel.monthlyLiters")}</Text>
          <TouchableOpacity style={S.exportBtn} onPress={handleExportPdf}>
            <Feather name="share" size={16} color={FUEL_ACCENT} />
          </TouchableOpacity>
        </View>
        <View style={S.chartContainer}>
          <View style={S.chartYAxis}>
            <Text style={S.chartYLabel}>{Math.round(maxLiters)} L</Text>
            <Text style={S.chartYLabel}>{Math.round(maxLiters / 2)} L</Text>
            <Text style={S.chartYLabel}>0 L</Text>
          </View>
          <View style={S.barsContainer}>
            {last6Months.map((m, i) => (
              <View key={i} style={S.barWrapper}>
                <View style={[S.barBg, { height: 120 }]}>
                  <View 
                    style={[
                      S.bar, 
                      { 
                        height: `${(m.liters / maxLiters) * 100}%`,
                        backgroundColor: i === 5 ? FUEL_ACCENT : D.inkGhost,
                      }
                    ]} 
                  />
                </View>
                <Text style={S.barLabel}>{m.month}</Text>
                <Text style={S.barValue}>{m.liters.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Efficiency Card */}
      <View style={S.efficiencyCard}>
        <View style={S.efficiencyHeader}>
          <Text style={S.efficiencyTitle}>{t("fuel.efficiency")}</Text>
          <View style={[S.efficiencyBadge, { 
            backgroundColor: efficiencyStatus === "good" ? D.emeraldBg : efficiencyStatus === "bad" ? D.roseBg : D.amberBg 
          }]}>
            <Text style={[S.efficiencyBadgeTxt, { 
              color: efficiencyStatus === "good" ? D.emerald : efficiencyStatus === "bad" ? D.rose : D.amber 
            }]}>
              {efficiencyStatus === "good" ? t("fuel.good") : efficiencyStatus === "bad" ? t("fuel.bad") : t("fuel.neutral")}
            </Text>
          </View>
        </View>
        <View style={S.efficiencyRow}>
          <View style={S.efficiencyItem}>
            <Text style={S.efficiencyLabel}>{t("fuel.currentMonth")}</Text>
            <Text style={[S.efficiencyValue, { color: FUEL_ACCENT }]}>
              {currentMonthData?.consumption > 0 ? `${currentMonthData?.consumption.toFixed(1)} L/100km` : "-"}
            </Text>
          </View>
          <View style={S.efficiencyDivider} />
          <View style={S.efficiencyItem}>
            <Text style={S.efficiencyLabel}>{t("fuel.previousMonth")}</Text>
            <Text style={S.efficiencyValue}>
              {prevMonthData?.consumption > 0 ? `${prevMonthData?.consumption.toFixed(1)} L/100km` : "-"}
            </Text>
          </View>
          <View style={S.efficiencyDivider} />
          <View style={S.efficiencyItem}>
            <Text style={S.efficiencyLabel}>{t("fuel.target")}</Text>
            <Text style={S.efficiencyValue}>12 L/100km</Text>
          </View>
        </View>
      </View>

      {/* Price Trend */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>{t("fuel.priceTrend")}</Text>
        <View style={S.priceList}>
          {[...sourceEntries]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map((entry) => (
            <View key={entry.id} style={S.priceItem}>
              <Text style={S.priceDate}>
                {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </Text>
              <Text style={S.priceValue}>{entry.pricePerLiter.toFixed(2)} MAD/L</Text>
            </View>
          ))}
          {sourceEntries.length === 0 && (
            <Text style={S.emptyText}>{t("fuel.noData")}</Text>
          )}
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg, padding: 16 },
  section: { backgroundColor: D.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.ink },
  exportBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: D.emeraldBg, justifyContent: "center", alignItems: "center" },
  chartContainer: { flexDirection: "row", height: 180 },
  chartYAxis: { width: 40, justifyContent: "space-between", paddingRight: 8 },
  chartYLabel: { fontSize: 9, color: D.inkSoft, textAlign: "right" },
  barsContainer: { flex: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end" },
  barWrapper: { alignItems: "center", width: BAR_WIDTH },
  barBg: { width: BAR_WIDTH - 8, backgroundColor: D.border, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: 6 },
  barLabel: { fontSize: 10, color: D.inkSoft, marginTop: 4 },
  barValue: { fontSize: 9, color: D.ink, fontFamily: "Inter_500Medium" },
  efficiencyCard: { backgroundColor: D.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  efficiencyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  efficiencyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.ink },
  efficiencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  efficiencyBadgeTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  efficiencyRow: { flexDirection: "row", justifyContent: "space-around" },
  efficiencyItem: { alignItems: "center", flex: 1 },
  efficiencyDivider: { width: 1, backgroundColor: D.border, marginHorizontal: 8 },
  efficiencyLabel: { fontSize: 11, color: D.inkSoft },
  efficiencyValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: D.ink, marginTop: 4 },
  priceList: {},
  priceItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: D.border },
  priceDate: { fontSize: 13, color: D.inkSoft },
  priceValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.ink },
  emptyText: { fontSize: 13, color: D.inkSoft, textAlign: "center", paddingVertical: 20 },
});
