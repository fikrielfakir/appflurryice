import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useApp } from "@/context/AppContext";
import { Transaction } from "@/context/AppContext";
import { AppHeader } from "@/components/common/AppHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TransactionRow } from "@/components/reports/TransactionRow";
import { DailySummaryModal } from "@/components/reports/DailySummaryModal";
import { useReportMetrics, FilterKey } from "@/hooks/useReportMetrics";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";

// ── Formatting utility ────────────────────────────────────────────────────────
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:         "#F7F6F2",
  surface:    "#FFFFFF",
  card:       "#FFFFFF",
  heroA:      "#1C1C2E",
  heroB:      "#2D2B55",
  heroAccent: "#6C63FF",
  heroGlow:   "#A78BFA",
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
  blue:       "#3B82F6",
  blueBg:     "#EFF6FF",
  violet:     "#8B5CF6",
  violetBg:   "#F5F3FF",
  orange:     "#F97316",
  orangeBg:   "#FFF3E8",
  teal:       "#14B8A6",
  tealBg:     "#F0FDFA",
  border:     "#ECEAE4",
  shadow:     "rgba(17,17,24,0.06)",
};

// ── Transaction type label helper ────────────────────────────────────────────
function getTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "sell":         return t("reports.sale");
    case "transfer_in":  return t("reports.transferIn");
    case "transfer_out": return t("reports.transferOut");
    case "adjustment":   return t("reports.adjustment");
    default:             return type;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  dotColor,
}: {
  title: string;
  dotColor: string;
}) {
  return (
    <View style={S.sectionHeader}>
      <View style={[S.sectionDot, { backgroundColor: dotColor }]} />
      <Text style={S.sectionTitle}>{title}</Text>
    </View>
  );
}

function MetricsRow({ children }: { children: React.ReactNode }) {
  return <View style={S.metricsRow}>{children}</View>;
}

function EmptyTransactions({ label }: { label: string }) {
  return (
    <View style={S.emptyWrap}>
      <View style={S.emptyIcon}>
        <Feather name="inbox" size={28} color={D.inkSoft} />
      </View>
      <Text style={S.emptyTitle}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, transactions, products, setIsSidebarOpen, userProfile, config } = useApp();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<FilterKey>("daily");
  const [activeTab, setActiveTab] = useState<"metrics" | "transactions">("metrics");
  const [showPrintModal, setShowPrintModal] = useState(false);

  const { filteredSales, filteredTransactions, financials, statusCounts, truckStock } =
    useReportMetrics(sales, transactions, products, filter);

  const {
    printDailySummary,
    isConnecting,
    isPrinting,
    isSuccess,
    currentPrinter,
  } = usePrintInvoice();

  const periodLabel = useMemo(() => {
    const map: Record<FilterKey, string> = {
      daily:   "Aujourd'hui",
      weekly:  "Cette semaine",
      monthly: "Ce mois",
      all:     "Tout",
    };
    return map[filter];
  }, [filter]);

  const summaryData = useMemo(() => ({
    totalSales:     financials.totalRevenue,
    cashCollected:  financials.cashCollected,
    customerCredit: financials.customerCredit,
    stockValue:     truckStock.value,
    salesCount:     filteredSales.length,
    periodLabel,
    vendorName:     userProfile?.name || userProfile?.username,
    truckLabel:     config.truckLocation,
  }), [financials, truckStock, filteredSales.length, periodLabel, userProfile, config]);

  // ── Filter pills config ──────────────────────────────────────────────────
  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "daily",   label: t("reports.daily") },
    { key: "weekly",  label: t("reports.weekly") },
    { key: "monthly", label: t("reports.monthly") },
    { key: "all",     label: t("reports.all") },
  ];

  // ── FlatList keyExtractor & renderItem (stable references) ───────────────
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const renderTransaction = useCallback(
    ({ item, index }: ListRenderItemInfo<Transaction>) => (
      <TransactionRow
        item={item}
        typeLabel={getTypeLabel(item.type, t)}
        isLast={index === filteredTransactions.length - 1}
      />
    ),
    [filteredTransactions.length, t]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((key: FilterKey) => {
    Haptics.selectionAsync();
    setFilter(key);
  }, []);

  const handleTabChange = useCallback(
    (tab: "metrics" | "transactions") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
    },
    []
  );

  const handleOpenPrint = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPrintModal(true);
  }, []);

  const handleClosePrint = useCallback(() => {
    setShowPrintModal(false);
  }, []);

  const handlePrint = useCallback(async () => {
    await printDailySummary(summaryData);
  }, [printDailySummary, summaryData]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={S.screen}>

      {/* ── Hero ── */}
      <View style={S.heroWrapper}>
        <LinearGradient
          colors={[D.heroA, D.heroB]}
          style={StyleSheet.absoluteFill}
        />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

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
          rightActions={
            <TouchableOpacity
              style={S.printHeaderBtn}
              onPress={handleOpenPrint}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="printer" size={17} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          }
        />

        {/* Stats summary row */}
        <View style={S.heroInner}>
          <View style={S.heroLeft}>
            <Text style={S.heroLabel}>{t("reports.totalRevenue")}</Text>
            <Text style={S.heroValue}>MAD {fmt(financials.totalRevenue)}</Text>
            <Text style={S.heroSub}>
              {filteredSales.length} {t("tabs.sales")} · {t(`reports.${filter}`)}
            </Text>
          </View>

          <View style={S.heroDivider} />

          <View style={S.heroRight}>
            <View style={S.heroMini}>
              <View style={[S.heroMiniIcon, { backgroundColor: D.rose + "30" }]}>
                <Feather name="clock" size={13} color="#F87171" />
              </View>
              <View>
                <Text style={S.heroMiniLbl}>{t("reports.amountDue")}</Text>
                <Text style={[S.heroMiniVal, { color: "#F87171" }]}>
                  MAD {fmt(financials.customerCredit)}
                </Text>
              </View>
            </View>
            <View style={S.heroMini}>
              <View style={[S.heroMiniIcon, { backgroundColor: D.emerald + "30" }]}>
                <Feather name="package" size={13} color={D.heroGlow} />
              </View>
              <View>
                <Text style={S.heroMiniLbl}>{t("reports.productsCount")}</Text>
                <Text style={[S.heroMiniVal, { color: D.heroGlow }]}>
                  {truckStock.count}
                </Text>
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
              onPress={() => handleFilterChange(f.key)}
            >
              <Text
                style={[
                  S.filterTxt,
                  filter === f.key && S.filterTxtActive,
                ]}
              >
                {f.label}
              </Text>
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
            onPress={() => handleTabChange(tab)}
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

      {/* ── Content ── */}
      {activeTab === "metrics" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            S.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
        >
          {/* Truck / Stock section */}
          <View style={S.section}>
            <SectionHeader
              title={t("reports.truckStock")}
              dotColor={D.blue}
            />
            <MetricsRow>
              <MetricCard
                label={t("reports.productsCount")}
                value={`${truckStock.count}`}
                icon="package"
                color={D.blue}
                bg={D.blueBg}
              />
              <MetricCard
                label={t("reports.remainingValue")}
                value={`MAD ${fmt(truckStock.value)}`}
                icon="truck"
                color={D.violet}
                bg={D.violetBg}
              />
            </MetricsRow>
          </View>

          {/* Financial summary section */}
          <View style={S.section}>
            <SectionHeader
              title={t("reports.financialSummary")}
              dotColor={D.emerald}
            />
            <MetricsRow>
              <MetricCard
                label={t("reports.revenue")}
                value={`MAD ${fmt(financials.totalRevenue)}`}
                icon="trending-up"
                color={D.emerald}
                bg={D.emeraldBg}
                sub={`${filteredSales.length} ${t("tabs.sales")}`}
              />
              <MetricCard
                label={t("reports.cashCollected")}
                value={`MAD ${fmt(financials.cashCollected)}`}
                icon="check-circle"
                color={D.teal}
                bg={D.tealBg}
                sub={`${Math.round(financials.collectionRate)}% ${t("reports.collected")}`}
              />
            </MetricsRow>

            <View style={[S.metricsRow, { marginTop: 12 }]}>
              <MetricCard
                label={t("reports.customerCredit")}
                value={`MAD ${fmt(financials.customerCredit)}`}
                icon="clock"
                color={D.amber}
                bg={D.amberBg}
                sub={`${statusCounts.due} ${t("reports.unpaid")}`}
              />
              <MetricCard
                label={t("reports.avgSaleValue")}
                value={`MAD ${fmt(financials.avgSaleValue)}`}
                icon="bar-chart-2"
                color={D.orange}
                bg={D.orangeBg}
                sub={t("reports.perInvoice")}
              />
            </View>
          </View>

          {/* Sales by status section */}
          <View style={S.section}>
            <SectionHeader
              title={t("reports.salesByStatus")}
              dotColor={D.violet}
            />

            <View style={S.progressBarWrap}>
              <View
                style={[
                  S.progressSeg,
                  {
                    flex: statusCounts.paid / statusCounts.total,
                    backgroundColor: D.emerald,
                  },
                ]}
              />
              <View
                style={[
                  S.progressSeg,
                  {
                    flex: statusCounts.partial / statusCounts.total,
                    backgroundColor: D.amber,
                  },
                ]}
              />
              <View
                style={[
                  S.progressSeg,
                  {
                    flex: statusCounts.due / statusCounts.total,
                    backgroundColor: D.rose,
                  },
                ]}
              />
            </View>

            <View style={S.statusRow}>
              {[
                {
                  label: t("reports.paid"),
                  count: statusCounts.paid,
                  color: D.emerald,
                  bg: D.emeraldBg,
                },
                {
                  label: t("reports.partial"),
                  count: statusCounts.partial,
                  color: D.amber,
                  bg: D.amberBg,
                },
                {
                  label: t("reports.due"),
                  count: statusCounts.due,
                  color: D.rose,
                  bg: D.roseBg,
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[S.statusCard, { borderTopColor: s.color }]}
                >
                  <View
                    style={[S.statusIconWrap, { backgroundColor: s.bg }]}
                  >
                    <Text style={[S.statusCount, { color: s.color }]}>
                      {s.count}
                    </Text>
                  </View>
                  <Text style={S.statusLabel}>{s.label}</Text>
                  <Text style={S.statusPct}>
                    {Math.round((s.count / statusCounts.total) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ── Transactions tab: FlatList for performance ── */
        <View style={S.txContainer}>
          <View style={S.section}>
            <SectionHeader
              title={t("reports.transactionLogs")}
              dotColor={D.heroAccent}
            />
          </View>

          {filteredTransactions.length === 0 ? (
            <EmptyTransactions label={t("reports.noTransactions")} />
          ) : (
            <View style={S.txCard}>
              <FlatList
                data={filteredTransactions}
                keyExtractor={keyExtractor}
                renderItem={renderTransaction}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
                initialNumToRender={20}
                maxToRenderPerBatch={30}
                windowSize={10}
                removeClippedSubviews
              />
            </View>
          )}
        </View>
      )}

      {/* ── Daily Summary Print Modal ── */}
      <DailySummaryModal
        visible={showPrintModal}
        data={summaryData}
        isPrinting={isPrinting}
        isConnecting={isConnecting}
        isSuccess={isSuccess}
        printerName={currentPrinter?.name}
        onPrint={handlePrint}
        onClose={handleClosePrint}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },

  // Print header button
  printHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero
  heroWrapper: { overflow: "hidden" },
  blob1: {
    position: "absolute",
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: D.heroAccent,
    opacity: 0.1, top: -50, right: -50,
  },
  blob2: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: D.heroGlow,
    opacity: 0.07, bottom: 30, left: -30,
  },
  heroInner: {
    flexDirection: "row",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18,
  },
  heroLeft:  { flex: 1.2, justifyContent: "center" },
  heroRight: { flex: 1, justifyContent: "space-around", gap: 12 },
  heroLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  heroSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
  },
  heroMini: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroMiniIcon: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  heroMiniLbl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  heroMiniVal: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 1 },

  // Filter pills
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
  filterTxt: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  filterTxtActive: { color: D.heroB, fontFamily: "Inter_700Bold" },

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

  // Sections
  scrollContent: {},
  section:        { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionDot:     { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:   {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    letterSpacing: -0.2,
  },
  metricsRow: { flexDirection: "row", gap: 12 },

  // Progress bar
  progressBarWrap: {
    flexDirection: "row",
    height: 6, borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16, gap: 2,
  },
  progressSeg: { height: 6, borderRadius: 3, minWidth: 4 },

  // Status cards
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
  statusIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  statusCount: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: D.inkSoft },
  statusPct:   { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkGhost },

  // Transactions
  txContainer: { flex: 1 },
  txCard: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: D.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: D.bg,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: D.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: D.inkSoft,
  },
});
