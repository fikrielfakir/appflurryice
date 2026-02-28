import React, { useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MetricCard({ label, value, icon, color, sub }: { label: string; value: string; icon: string; color: string; sub?: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: color + "30" }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

function BarChart({ items, max }: { items: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <View style={styles.barChart}>
      {items.map((item) => (
        <View key={item.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: max > 0 ? `${Math.max(4, (item.value / max) * 100)}%` as any : "4%",
                  backgroundColor: item.color,
                },
              ]}
            />
          </View>
          <Text style={styles.barValue}>${fmt(item.value)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, expenses, totalSales, totalExpenses, totalDue, netProfit, contacts } = useApp();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const paidSales = useMemo(() => sales.filter(s => s.status === "paid").length, [sales]);
  const dueSales = useMemo(() => sales.filter(s => s.status === "due").length, [sales]);
  const partialSales = useMemo(() => sales.filter(s => s.status === "partial").length, [sales]);
  const totalReceived = useMemo(() => sales.reduce((s, sale) => s + sale.paid, 0), [sales]);

  const expByCat = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach(e => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ label: cat, value: amt, color: catColor(cat) }));
  }, [expenses]);

  const maxExp = useMemo(() => Math.max(...expByCat.map(e => e.value), 1), [expByCat]);

  const salesByStatus = [
    { label: "Paid", value: paidSales, color: C.success },
    { label: "Partial", value: partialSales, color: C.warning },
    { label: "Due", value: dueSales, color: C.danger },
  ];

  const customerCount = contacts.filter(c => c.type === "customer").length;
  const leadCount = contacts.filter(c => c.type === "lead").length;
  const supplierCount = contacts.filter(c => c.type === "supplier").length;

  const marginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#1A2240", C.background]} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>Business performance overview</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + bottomInset }}>
        <View style={styles.metricsGrid}>
          <MetricCard label="Total Revenue" value={`$${fmt(totalSales)}`} icon="trending-up" color={C.primary} sub={`${sales.length} sales`} />
          <MetricCard label="Total Expenses" value={`$${fmt(totalExpenses)}`} icon="trending-down" color={C.secondary} sub={`${expenses.length} records`} />
          <MetricCard label="Net Profit" value={`$${fmt(netProfit)}`} icon="award" color={netProfit >= 0 ? C.success : C.danger} sub={`${marginPct}% margin`} />
          <MetricCard label="Amount Due" value={`$${fmt(totalDue)}`} icon="clock" color={C.warning} sub={`${dueSales} unpaid`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue vs Expenses</Text>
          <View style={styles.compCard}>
            <View style={styles.compRow}>
              <View style={styles.compItem}>
                <View style={[styles.compDot, { backgroundColor: C.primary }]} />
                <View>
                  <Text style={styles.compLabel}>Revenue</Text>
                  <Text style={[styles.compValue, { color: C.primary }]}>${fmt(totalSales)}</Text>
                </View>
              </View>
              <View style={styles.compDivider} />
              <View style={styles.compItem}>
                <View style={[styles.compDot, { backgroundColor: C.secondary }]} />
                <View>
                  <Text style={styles.compLabel}>Expenses</Text>
                  <Text style={[styles.compValue, { color: C.secondary }]}>${fmt(totalExpenses)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.profitBar}>
              <View style={styles.profitTrack}>
                <LinearGradient
                  colors={["#4C6FFF", "#6B8FFF"]}
                  style={[
                    styles.profitFill,
                    {
                      width: totalSales > 0 ? `${Math.min(100, (totalSales / (totalSales + totalExpenses)) * 100)}%` as any : "50%",
                    },
                  ]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.profitPct}>
                {netProfit >= 0 ? "+" : ""}{fmt(netProfit)} net
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales by Status</Text>
          <View style={styles.statusRow}>
            {salesByStatus.map(s => (
              <View key={s.label} style={[styles.statusCard, { borderColor: s.color + "30" }]}>
                <Text style={[styles.statusCount, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statusLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {expByCat.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Breakdown</Text>
            <View style={styles.chartCard}>
              <BarChart items={expByCat} max={maxExp} />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacts Summary</Text>
          <View style={styles.contactsRow}>
            <View style={[styles.contactCard, { borderColor: C.primary + "30" }]}>
              <Text style={[styles.contactCount, { color: C.primary }]}>{customerCount}</Text>
              <Text style={styles.contactLabel}>Customers</Text>
            </View>
            <View style={[styles.contactCard, { borderColor: C.warning + "30" }]}>
              <Text style={[styles.contactCount, { color: C.warning }]}>{leadCount}</Text>
              <Text style={styles.contactLabel}>Leads</Text>
            </View>
            <View style={[styles.contactCard, { borderColor: C.success + "30" }]}>
              <Text style={[styles.contactCount, { color: C.success }]}>{supplierCount}</Text>
              <Text style={styles.contactLabel}>Suppliers</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Collection</Text>
          <View style={styles.collectionCard}>
            <View style={styles.collRow}>
              <Text style={styles.collLabel}>Total Invoiced</Text>
              <Text style={styles.collValue}>${fmt(totalSales)}</Text>
            </View>
            <View style={styles.collRow}>
              <Text style={styles.collLabel}>Total Received</Text>
              <Text style={[styles.collValue, { color: C.success }]}>${fmt(totalReceived)}</Text>
            </View>
            <View style={styles.collRow}>
              <Text style={styles.collLabel}>Outstanding</Text>
              <Text style={[styles.collValue, { color: C.danger }]}>${fmt(totalDue)}</Text>
            </View>
            <View style={styles.collDivider} />
            <View style={styles.collRow}>
              <Text style={styles.collLabel}>Collection Rate</Text>
              <Text style={[styles.collValue, { color: C.primary }]}>
                {totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(1) : "0.0"}%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CAT_COLORS: Record<string, string> = {
  "Office Rent": "#6E62B6",
  "Utilities": Colors.dark.warning,
  "Salaries": Colors.dark.primary,
  "Marketing": Colors.dark.secondary,
  "Supplies": Colors.dark.success,
  "Travel": "#41C4D3",
  "Equipment": "#FF6B9D",
  "Other": Colors.dark.textSecondary,
};

function catColor(cat: string) {
  return CAT_COLORS[cat] || Colors.dark.primary;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 4 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginTop: 16 },
  metricCard: {
    flex: 1, minWidth: "45%", backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, gap: 4,
  },
  metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  metricValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  metricLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  metricSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 12 },
  compCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 16 },
  compRow: { flexDirection: "row", alignItems: "center" },
  compItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  compDot: { width: 10, height: 10, borderRadius: 5 },
  compLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  compValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  compDivider: { width: 1, height: 36, backgroundColor: C.border, marginHorizontal: 16 },
  profitBar: { gap: 6 },
  profitTrack: { height: 8, backgroundColor: C.surface, borderRadius: 4, overflow: "hidden" },
  profitFill: { height: "100%", borderRadius: 4 },
  profitPct: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary, textAlign: "right" },
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  statusCount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  chartCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  barChart: { gap: 14 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 90, fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  barTrack: { flex: 1, height: 8, backgroundColor: C.surface, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: { width: 72, fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff", textAlign: "right" },
  contactsRow: { flexDirection: "row", gap: 10 },
  contactCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  contactCount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  contactLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  collectionCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 12 },
  collRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  collLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
  collValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  collDivider: { height: 1, backgroundColor: C.border },
});
