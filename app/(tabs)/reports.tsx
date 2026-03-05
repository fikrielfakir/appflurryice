import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform,
  TouchableOpacity, Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

const C = Colors;
const { width: SCREEN_W } = Dimensions.get("window");

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (part / total) * 100));
}

// ─── sub-components ─────────────────────────────────────────────────────────

/** Big summary card – green / yellow / red */
function SummaryCard({
  icon, title, subtitle, count, amount, color, pctValue, index,
}: {
  icon: string; title: string; subtitle: string;
  count: number; amount: number; color: string;
  pctValue: number; index: number;
}) {
  const dimColor = color + "22";
  const borderColor = color + "44";

  return (
    <View style={[styles.summaryCard, { backgroundColor: dimColor, borderColor }]}>
      {/* corner glow */}
      <View style={[styles.cardCornerGlow, { backgroundColor: color + "15" }]} />

      <View style={styles.cardTop}>
        <View style={[styles.cardIconBox, { backgroundColor: color + "22" }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: C.textSecondary }]}>{subtitle}</Text>
        </View>
        <Text style={[styles.cardPct, { color }]}>{Math.round(pctValue)}%</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={[styles.statBox, { backgroundColor: "#ffffff0d" }]}>
          <Text style={[styles.statVal, { color }]}>{count}</Text>
          <Text style={styles.statLbl}>عدد</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: "#ffffff0d" }]}>
          <Text style={[styles.statVal, { color }]}>MAD {fmt(amount)}</Text>
          <Text style={styles.statLbl}>الإجمالي</Text>
        </View>
      </View>

      {/* progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pctValue}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

/** Horizontal bar chart row */
function BarRow({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const barPct = pct(value, max);
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(4, barPct)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color: C.textPrimary }]}>MAD {fmt(value)}</Text>
    </View>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, expenses, totalSales, totalExpenses, totalDue, netProfit, contacts, setIsSidebarOpen } = useApp();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  // ── computed ────────────────────────────────────────────────────────────
  const paidSales   = useMemo(() => sales.filter(s => s.status === "paid"),    [sales]);
  const pendingSales = useMemo(() => sales.filter(s => s.status !== "paid"),   [sales]);

  const paidTotal   = useMemo(() => paidSales.reduce((a, s)  => a + s.amount, 0), [paidSales]);
  const pendTotal   = useMemo(() => pendingSales.reduce((a, s) => a + s.amount, 0), [pendingSales]);

  // "remaining" = stock value concept adapted → total due amount
  const remainTotal = totalDue;
  const remainCount = useMemo(() => sales.filter(s => s.status === "due").length, [sales]);

  const grandTotal  = totalSales + remainTotal;

  const totalReceived = useMemo(() => sales.reduce((a, s) => a + s.paid, 0), [sales]);

  const expByCat = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach(e => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const maxExp = Math.max(...expByCat.map(e => e[1]), 1);

  const EXP_COLORS: Record<string, string> = {
    "Office Rent": "#6E62B6", "Utilities": C.warning, "Salaries": C.primary,
    "Marketing": C.accent,   "Supplies": C.success,  "Travel": "#41C4D3",
    "Equipment": "#FF6B9D",  "Other": C.textSecondary,
  };
  const catColor = (c: string) => EXP_COLORS[c] || C.primary;

  const marginPct = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";
  const collectionRate = totalSales > 0 ? ((totalReceived / totalSales) * 100).toFixed(1) : "0.0";

  const customerCount  = contacts.filter(c => c.type === "customer").length;
  const leadCount      = contacts.filter(c => c.type === "lead").length;
  const supplierCount  = contacts.filter(c => c.type === "supplier").length;

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <AppHeader
        title={t("reports.title")}
        dark
        showBack
        onBackPress={() => router.back()}
        showMenu
        onMenuPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsSidebarOpen(true); }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
      >
        {/* ── gradient hero ─────────────────────────────────── */}
        <LinearGradient colors={[C.accent, C.surface]} style={styles.hero}>
          {/* live chip */}
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t('reports.today')}</Text>
          </View>

          {/* period tabs */}
          <View style={styles.tabs}>
            {(["day", "week", "month"] as const).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.tab, period === p && styles.tabActive]}
                onPress={() => { Haptics.selectionAsync(); setPeriod(p); }}
              >
                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                  {p === "day" ? t('reports.day') : p === "week" ? t('reports.week') : t('reports.month')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* ── 3 main summary cards ──────────────────────────── */}
        <View style={styles.section}>
          {/* 1 — Sold / Paid */}
          <SummaryCard
            icon="check-circle"
            title={t('reports.paidSales')}
            subtitle={t('reports.creditSales')}
            count={paidSales.length}
            amount={paidTotal}
            color="#00e57a"
            pctValue={pct(paidSales.length, sales.length)}
            index={0}
          />
          {/* 2 — Credit / Pending */}
          <SummaryCard
            icon="clock"
            title={t('reports.pendingSales')}
            subtitle={t('reports.pendingSales')}
            count={pendingSales.length}
            amount={pendTotal}
            color="#ffc933"
            pctValue={pct(pendingSales.length, sales.length)}
            index={1}
          />
          {/* 3 — Remaining / Due */}
          <SummaryCard
            icon="package"
            title={t('reports.amountDue')}
            subtitle={t('reports.amountDue')}
            count={remainCount}
            amount={remainTotal}
            color="#ff4f6b"
            pctValue={pct(remainCount, sales.length)}
            index={2}
          />
        </View>

        {/* ── totals strip ──────────────────────────────────── */}
        <View style={[styles.totalsCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.totalsTitle}>📊 {t('reports.grandTotal')}</Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalVal, { color: C.textPrimary }]}>{sales.length}</Text>
              <Text style={styles.totalLbl}>{t('reports.totalSales')}</Text>
            </View>
            <View style={[styles.totalDivider, { backgroundColor: C.border }]} />
            <View style={styles.totalItem}>
              <Text style={[styles.totalVal, { color: C.textPrimary }]}>MAD {fmt(totalSales)}</Text>
              <Text style={styles.totalLbl}>{t('reports.totalValue')}</Text>
            </View>
            <View style={[styles.totalDivider, { backgroundColor: C.border }]} />
            <View style={styles.totalItem}>
              <Text style={[styles.totalVal, { color: C.success }]}>{collectionRate}%</Text>
              <Text style={styles.totalLbl}>{t('reports.collectionRate')}</Text>
            </View>
          </View>
        </View>

        {/* ── Revenue vs Expenses ───────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('reports.revenueVsExpenses')}</Text>
          </View>

          <View style={[styles.compCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.compRow}>
              <View style={styles.compItem}>
                <View style={[styles.compDot, { backgroundColor: C.primary }]} />
                <View>
                  <Text style={[styles.compLabel, { color: C.textSecondary }]}>{t('reports.revenue')}</Text>
                  <Text style={[styles.compVal, { color: C.primary }]}>MAD {fmt(totalSales)}</Text>
                </View>
              </View>
              <View style={[styles.compSep, { backgroundColor: C.border }]} />
              <View style={styles.compItem}>
                <View style={[styles.compDot, { backgroundColor: C.accent }]} />
                <View>
                  <Text style={[styles.compLabel, { color: C.textSecondary }]}>{t('reports.expenses')}</Text>
                  <Text style={[styles.compVal, { color: C.accent }]}>MAD {fmt(totalExpenses)}</Text>
                </View>
              </View>
            </View>

            {/* visual bar */}
            <View style={[styles.profitTrack, { backgroundColor: C.border }]}>
              <LinearGradient
                colors={[C.primary, C.accent]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.profitFill, {
                  width: totalSales > 0
                    ? `${Math.min(100, (totalSales / (totalSales + totalExpenses)) * 100)}%` as any
                    : "50%",
                }]}
              />
            </View>

            <View style={styles.netRow}>
              <Text style={[styles.netLabel, { color: C.textSecondary }]}>{t('reports.netProfit')}</Text>
              <Text style={[styles.netVal, { color: netProfit >= 0 ? C.success : C.danger }]}>
                {netProfit >= 0 ? "+" : ""}MAD {fmt(netProfit)}
                <Text style={[styles.netPct, { color: C.textMuted }]}> ({marginPct}%)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment Collection ────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('reports.paymentCollection')}</Text>
          </View>

          <View style={[styles.collCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {[
              { label: t('reports.totalInvoices'), val: totalSales, color: C.textPrimary },
              { label: t('reports.amountCollected'), val: totalReceived, color: C.success },
              { label: t('reports.amountDue'), val: totalDue, color: C.danger },
            ].map((row, i) => (
              <View key={i} style={[styles.collRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: C.border + "55" }]}>
                <Text style={[styles.collLabel, { color: C.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.collVal, { color: row.color }]}>MAD {fmt(row.val)}</Text>
              </View>
            ))}
            {/* collection rate visual */}
            <View style={styles.rateRow}>
              <Text style={[styles.collLabel, { color: C.textSecondary }]}>{t('reports.collectionRate')}</Text>
              <Text style={[styles.collVal, { color: C.primary }]}>{collectionRate}%</Text>
            </View>
            <View style={[styles.rateTrack, { backgroundColor: C.border }]}>
              <View style={[styles.rateFill, {
                width: `${parseFloat(collectionRate)}%` as any,
                backgroundColor: C.primary,
              }]} />
            </View>
          </View>
        </View>

        {/* ── Sales by Status ───────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('reports.salesByStatus')}</Text>
          </View>

          <View style={styles.statusRow}>
            {[
              { label: t('reports.paid'), count: paidSales.length, color: C.success },
              { label: t('reports.partial'), count: sales.filter(s => s.status === "partial").length, color: C.warning },
              { label: t('reports.due'), count: remainCount, color: C.danger },
            ].map((s, i) => (
              <View key={i} style={[styles.statusCard, { backgroundColor: C.card, borderColor: s.color + "44" }]}>
                <Text style={[styles.statusCount, { color: s.color }]}>{s.count}</Text>
                <Text style={[styles.statusLabel, { color: C.textSecondary }]}>{s.label}</Text>
                <View style={[styles.statusBar, { backgroundColor: C.border }]}>
                  <View style={[styles.statusBarFill, {
                    width: `${pct(s.count, sales.length)}%` as any,
                    backgroundColor: s.color,
                  }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Expense Breakdown ─────────────────────────────── */}
        {expByCat.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>تفصيل المصروفات</Text>
            </View>

            <View style={[styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {expByCat.map(([cat, amt]) => (
                <BarRow key={cat} label={cat} value={amt} max={maxExp} color={catColor(cat)} />
              ))}
            </View>
          </View>
        )}

        {/* ── Contacts Summary ──────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>ملخص جهات الاتصال</Text>
          </View>

          <View style={styles.contactsRow}>
            {[
              { label: "عملاء",  count: customerCount, color: C.primary },
              { label: "محتملون", count: leadCount,     color: C.warning },
              { label: "موردون", count: supplierCount,  color: C.success },
            ].map((c, i) => (
              <View key={i} style={[styles.contactCard, { backgroundColor: C.card, borderColor: c.color + "44" }]}>
                <Text style={[styles.contactCount, { color: c.color }]}>{c.count}</Text>
                <Text style={[styles.contactLabel, { color: C.textSecondary }]}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },

  // hero
  hero: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff12", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1, borderColor: "#ffffff22",
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#00e57a",
  },
  liveText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#ffffffcc" },

  // tabs
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1, textAlign: "center", paddingVertical: 9,
    borderRadius: 12, backgroundColor: "#ffffff14",
    borderWidth: 1, borderColor: "#ffffff22",
    alignItems: "center",
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#ffffffaa" },
  tabTextActive: { color: "#fff" },

  // ── summary cards
  section: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },

  summaryCard: {
    borderRadius: 22, padding: 18,
    borderWidth: 1, overflow: "hidden",
    position: "relative",
  },
  cardCornerGlow: {
    position: "absolute", top: 0, right: 0,
    width: 80, height: 80,
    borderRadius: 0,
    borderBottomLeftRadius: 80,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  cardIconBox: { width: 40, height: 40, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardPct: { fontSize: 20, fontFamily: "Inter_700Bold" },

  cardStats: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, borderRadius: 14, padding: 12 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#ffffff66", marginTop: 3 },

  progressTrack: { height: 4, backgroundColor: "#ffffff15", borderRadius: 4, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", borderRadius: 4 },

  // ── totals strip
  totalsCard: {
    marginHorizontal: 16, marginTop: 18,
    borderRadius: 22, padding: 18, borderWidth: 1,
  },
  totalsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginBottom: 14 },
  totalsRow: { flexDirection: "row", alignItems: "center" },
  totalItem: { flex: 1, alignItems: "center" },
  totalVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 3, textAlign: "center" },
  totalDivider: { width: 1, height: 36, marginHorizontal: 4 },

  // ── section blocks
  sectionBlock: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // comparison card
  compCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 16 },
  compRow: { flexDirection: "row", alignItems: "center" },
  compItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  compDot: { width: 10, height: 10, borderRadius: 5 },
  compLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  compVal: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  compSep: { width: 1, height: 36, marginHorizontal: 12 },

  profitTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  profitFill: { height: "100%", borderRadius: 4 },

  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  netVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  netPct: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // collection card
  collCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 0 },
  collRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  collLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  collVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rateTrack: { height: 6, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  rateFill: { height: "100%", borderRadius: 4 },

  // status cards
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: {
    flex: 1, borderRadius: 18, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  statusCount: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusBar: { width: "100%", height: 4, borderRadius: 4, overflow: "hidden", marginTop: 6 },
  statusBarFill: { height: "100%", borderRadius: 4 },

  // expense chart
  chartCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 16 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 80, fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: C.border },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: { width: 88, fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "right" },

  // contacts
  contactsRow: { flexDirection: "row", gap: 10 },
  contactCard: {
    flex: 1, borderRadius: 18, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  contactCount: { fontSize: 26, fontFamily: "Inter_700Bold" },
  contactLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});