import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:          "#F7F6F2",
  surface:     "#FFFFFF",
  card:        "#FFFFFF",

  heroA:       "#1C1C2E",
  heroB:       "#2D2B55",
  heroAccent:  "#6C63FF",
  heroGlow:    "#A78BFA",

  ink:         "#111118",
  inkMid:      "#3D3C52",
  inkSoft:     "#8B8AA5",
  inkGhost:    "#C4C3D0",

  emerald:     "#00B37D",
  emeraldBg:   "#E6FAF4",
  rose:        "#F04E6A",
  roseBg:      "#FEE9ED",
  amber:       "#F59E0B",
  amberBg:     "#FEF3C7",
  blue:        "#3B82F6",
  blueBg:      "#EFF6FF",
  violet:      "#8B5CF6",
  violetBg:    "#F5F3FF",
  orange:      "#F97316",
  orangeBg:    "#FFF3E8",

  border:      "#ECEAE4",
  shadow:      "rgba(17,17,24,0.06)",
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "sell":         return D.emerald;
    case "transfer_in":  return D.blue;
    case "transfer_out": return D.rose;
    case "adjustment":   return D.orange;
    default:             return D.heroAccent;
  }
};

const getTypeBg = (type: string) => {
  switch (type) {
    case "sell":         return D.emeraldBg;
    case "transfer_in":  return D.blueBg;
    case "transfer_out": return D.roseBg;
    case "adjustment":   return D.orangeBg;
    default:             return D.violetBg;
  }
};

const getTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "sell":         return t("reports.sale");
    case "transfer_in":  return t("reports.transferIn");
    case "transfer_out": return t("reports.transferOut");
    case "adjustment":   return t("reports.adjustment");
    default:             return type;
  }
};

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color, bg, sub }: {
  label: string; value: string; icon: string; color: string; bg: string; sub?: string;
}) {
  return (
    <View style={[MC.card]}>
      <View style={[MC.iconWrap, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={MC.value}>{value}</Text>
      <Text style={MC.label}>{label}</Text>
      {sub ? <Text style={MC.sub}>{sub}</Text> : null}
      <View style={[MC.accent, { backgroundColor: color }]} />
    </View>
  );
}

const MC = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: D.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: D.border,
    gap: 4,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 11,
    justifyContent: "center", alignItems: "center",
    marginBottom: 8,
  },
  value: { fontSize: 17, fontFamily: "Inter_700Bold", color: D.ink },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", color: D.inkSoft },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkGhost, marginTop: 2 },
  accent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 3, borderRadius: 2,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, transactions, products, setIsSidebarOpen } = useApp();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"daily" | "weekly" | "monthly" | "all">("daily");
  const [activeTab, setActiveTab] = useState<"metrics" | "transactions">("metrics");

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return sales.filter((s) => {
      const d = new Date(s.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (filter === "daily")   return day.getTime() === today.getTime();
      if (filter === "weekly")  { const w = new Date(today); w.setDate(today.getDate() - 7); return day >= w; }
      if (filter === "monthly") return day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
      return true;
    });
  }, [sales, filter]);

  const stats = useMemo(() => {
    const rev = filteredSales.reduce((s, x) => s + x.amount, 0);
    const due = filteredSales.reduce((s, x) => s + (x.amount - x.paid), 0);
    return { rev, due };
  }, [filteredSales]);

  const truckStats = useMemo(() => {
    const inStock = products.filter((p) => (p.stock || 0) > 0);
    return {
      count: inStock.length,
      value: inStock.reduce((s, p) => s + ((p.stock || 0) * (p.price || 0)), 0),
    };
  }, [products]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (filter === "daily")   return day.getTime() === today.getTime();
      if (filter === "weekly")  { const w = new Date(today); w.setDate(today.getDate() - 7); return day >= w; }
      if (filter === "monthly") return day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
      return true;
    });
  }, [transactions, filter]);

  const paidCount    = filteredSales.filter((s) => s.status === "paid").length;
  const dueCount     = filteredSales.filter((s) => s.status === "due").length;
  const partialCount = filteredSales.filter((s) => s.status === "partial").length;
  const total        = paidCount + dueCount + partialCount || 1;

  const FILTERS: { key: "daily" | "weekly" | "monthly" | "all"; label: string }[] = [
    { key: "daily",   label: t("reports.daily") },
    { key: "weekly",  label: t("reports.weekly") },
    { key: "monthly", label: t("reports.monthly") },
    { key: "all",     label: t("reports.all") },
  ];

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero: gradient wraps the AppHeader so dark mode blends perfectly ── */}
      <View style={S.heroWrapper}>
        <LinearGradient
          colors={[D.heroA, D.heroB]}
          style={StyleSheet.absoluteFill}
        />
        {/* Decorative blobs */}
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        {/* AppHeader sits inside the gradient — dark=true gives transparent bg */}
        <AppHeader
          title={t("reports.title")}
          dark
          showBack
          onBackPress={() => router.back()}
          showMenu
          onMenuPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSidebarOpen(true);
          }}
        />

        {/* Stats row */}
        <View style={S.heroInner}>
          <View style={S.heroLeft}>
            <Text style={S.heroLabel}>{t("reports.totalRevenue") || "Revenu total"}</Text>
            <Text style={S.heroValue}>MAD {fmt(stats.rev)}</Text>
            <Text style={S.heroSub}>{filteredSales.length} ventes · {t(`reports.${filter}`)}</Text>
          </View>
          <View style={S.heroDivider} />
          <View style={S.heroRight}>
            <View style={S.heroMini}>
              <View style={[S.heroMiniIcon, { backgroundColor: D.rose + "30" }]}>
                <Feather name="clock" size={13} color="#F87171" />
              </View>
              <View>
                <Text style={S.heroMiniLbl}>{t("reports.amountDue")}</Text>
                <Text style={[S.heroMiniVal, { color: "#F87171" }]}>MAD {fmt(stats.due)}</Text>
              </View>
            </View>
            <View style={S.heroMini}>
              <View style={[S.heroMiniIcon, { backgroundColor: D.emerald + "30" }]}>
                <Feather name="package" size={13} color={D.heroGlow} />
              </View>
              <View>
                <Text style={S.heroMiniLbl}>{t("reports.productsCount")}</Text>
                <Text style={[S.heroMiniVal, { color: D.heroGlow }]}>{truckStats.count}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter pills */}
        <View style={S.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[S.filterPill, filter === f.key && S.filterPillActive]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
            >
              <Text style={[S.filterTxt, filter === f.key && S.filterTxtActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tab bar ── */}
      <View style={S.tabBar}>
        {(["metrics", "transactions"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[S.tabBtn, activeTab === tab && S.tabBtnActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}
          >
            <Feather
              name={tab === "metrics" ? "pie-chart" : "list"}
              size={14}
              color={activeTab === tab ? D.heroAccent : D.inkSoft}
              style={{ marginRight: 6 }}
            />
            <Text style={[S.tabTxt, activeTab === tab && S.tabTxtActive]}>
              {tab === "metrics" ? t("reports.metrics") : t("reports.logs")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* ── METRICS TAB ── */}
        {activeTab === "metrics" ? (
          <>
            {/* Truck / Stock */}
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <View style={[S.sectionDot, { backgroundColor: D.blue }]} />
                <Text style={S.sectionTitle}>{t("reports.truckStock")}</Text>
              </View>
              <View style={S.metricsRow}>
                <MetricCard
                  label={t("reports.productsCount")}
                  value={`${truckStats.count}`}
                  icon="package"
                  color={D.blue}
                  bg={D.blueBg}
                />
                <MetricCard
                  label={t("reports.remainingValue")}
                  value={`MAD ${fmt(truckStats.value)}`}
                  icon="truck"
                  color={D.violet}
                  bg={D.violetBg}
                />
              </View>
            </View>

            {/* Financial */}
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <View style={[S.sectionDot, { backgroundColor: D.emerald }]} />
                <Text style={S.sectionTitle}>{t("reports.financialSummary")}</Text>
              </View>
              <View style={S.metricsRow}>
                <MetricCard
                  label={t("reports.revenue")}
                  value={`MAD ${fmt(stats.rev)}`}
                  icon="trending-up"
                  color={D.emerald}
                  bg={D.emeraldBg}
                  sub={`${filteredSales.length} ${t("tabs.sales")}`}
                />
                <MetricCard
                  label={t("reports.amountDue")}
                  value={`MAD ${fmt(stats.due)}`}
                  icon="clock"
                  color={D.amber}
                  bg={D.amberBg}
                  sub={`${dueCount} ${t("reports.unpaid")}`}
                />
              </View>
            </View>

            {/* Sales by status */}
            <View style={S.section}>
              <View style={S.sectionHeader}>
                <View style={[S.sectionDot, { backgroundColor: D.violet }]} />
                <Text style={S.sectionTitle}>{t("reports.salesByStatus")}</Text>
              </View>

              {/* Progress bar */}
              <View style={S.progressBarWrap}>
                <View style={[S.progressSeg, { flex: paidCount / total, backgroundColor: D.emerald }]} />
                <View style={[S.progressSeg, { flex: partialCount / total, backgroundColor: D.amber }]} />
                <View style={[S.progressSeg, { flex: dueCount / total, backgroundColor: D.rose }]} />
              </View>

              <View style={S.statusRow}>
                {[
                  { label: t("reports.paid"),    count: paidCount,    color: D.emerald, bg: D.emeraldBg },
                  { label: t("reports.partial"), count: partialCount, color: D.amber,   bg: D.amberBg },
                  { label: t("reports.due"),     count: dueCount,     color: D.rose,    bg: D.roseBg },
                ].map((s) => (
                  <View key={s.label} style={[S.statusCard, { borderTopColor: s.color }]}>
                    <View style={[S.statusIconWrap, { backgroundColor: s.bg }]}>
                      <Text style={[S.statusCount, { color: s.color }]}>{s.count}</Text>
                    </View>
                    <Text style={S.statusLabel}>{s.label}</Text>
                    <Text style={S.statusPct}>{Math.round((s.count / total) * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          /* ── TRANSACTIONS TAB ── */
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <View style={[S.sectionDot, { backgroundColor: D.heroAccent }]} />
              <Text style={S.sectionTitle}>{t("reports.transactionLogs")}</Text>
            </View>

            {filteredTransactions.length === 0 ? (
              <View style={S.emptyWrap}>
                <View style={S.emptyIcon}>
                  <Feather name="inbox" size={28} color={D.inkSoft} />
                </View>
                <Text style={S.emptyTitle}>{t("reports.noTransactions")}</Text>
              </View>
            ) : (
              <View style={S.txList}>
                {filteredTransactions.map((tx, i) => {
                  const color = getTypeColor(tx.type);
                  const bg    = getTypeBg(tx.type);
                  return (
                    <View
                      key={tx.id}
                      style={[
                        S.txCard,
                        i === filteredTransactions.length - 1 && { marginBottom: 0 },
                      ]}
                    >
                      {/* Color strip */}
                      <View style={[S.txStrip, { backgroundColor: color }]} />

                      {/* Type badge */}
                      <View style={[S.txBadge, { backgroundColor: bg }]}>
                        <Text style={[S.txBadgeTxt, { color }]}>{getTypeLabel(tx.type, t)}</Text>
                      </View>

                      {/* Middle */}
                      <View style={S.txMid}>
                        <Text style={S.txProduct} numberOfLines={1}>{tx.productName}</Text>
                        <View style={S.txMeta}>
                          <Text style={S.txRef}>{tx.referenceNo}</Text>
                          <View style={S.txDot} />
                          <Text style={S.txDate}>
                            {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </Text>
                        </View>
                      </View>

                      {/* Qty / remaining */}
                      <View style={S.txRight}>
                        <Text style={[S.txQty, { color: tx.quantity < 0 ? D.rose : D.emerald }]}>
                          {tx.quantity > 0 ? "+" : ""}{tx.quantity}
                        </Text>
                        <Text style={S.txRem}>
                          {tx.remainingStock ?? "—"} <Text style={S.txRemUnit}>rest.</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero wrapper: gradient + header + stats + filters all in one block
  heroWrapper: {
    overflow: "hidden",
  },
  blob1: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: D.heroAccent, opacity: 0.1, top: -50, right: -50,
  },
  blob2: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: D.heroGlow, opacity: 0.07, bottom: 30, left: -30,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 13,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: D.heroAccent },
  tabTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.inkSoft },
  tabTxtActive: { color: D.heroAccent },

  heroInner: {
    flexDirection: "row",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18,
  },
  heroLeft: { flex: 1.2, justifyContent: "center" },
  heroLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  heroValue: { color: "#FFFFFF", fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  heroSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 16 },
  heroRight: { flex: 1, justifyContent: "space-around", gap: 12 },
  heroMini: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroMiniIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  heroMiniLbl: { color: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "Inter_400Regular" },
  heroMiniVal: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  filterPillActive: { backgroundColor: "#FFFFFF" },
  filterTxt: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_500Medium" },
  filterTxtActive: { color: D.heroB, fontFamily: "Inter_700Bold" },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: D.ink, letterSpacing: -0.2 },
  metricsRow: { flexDirection: "row", gap: 12 },

  // Status
  progressBarWrap: {
    flexDirection: "row",
    height: 6, borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16, gap: 2,
  },
  progressSeg: { height: 6, borderRadius: 3, minWidth: 4 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: {
    flex: 1,
    backgroundColor: D.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: D.border,
    borderTopWidth: 3,
    alignItems: "center", gap: 4,
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6,
  },
  statusIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statusCount: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: D.inkSoft },
  statusPct: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkGhost },

  // Transactions
  txList: {
    backgroundColor: D.card,
    borderRadius: 18,
    borderWidth: 1, borderColor: D.border,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6,
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13, paddingRight: 16, paddingLeft: 4,
    borderBottomWidth: 1, borderBottomColor: D.border,
    gap: 10,
  },
  txStrip: { width: 3, height: 36, borderRadius: 3 },
  txBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  txBadgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
  txMid: { flex: 1 },
  txProduct: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.ink, marginBottom: 3 },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  txRef: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  txDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: D.inkGhost },
  txDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  txRight: { alignItems: "flex-end", gap: 3 },
  txQty: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txRem: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  txRemUnit: { color: D.inkGhost },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 56, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: D.bg,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: D.border,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_500Medium", color: D.inkSoft },
});