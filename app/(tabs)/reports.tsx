import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ListRenderItemInfo,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-root-toast";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useApp } from "@/context/AppContext";
import { Transaction, Sale } from "@/context/AppContext";
import { AppHeader } from "@/components/common/AppHeader";
import { MetricCard } from "@/components/reports/MetricCard";
import { TransactionRow } from "@/components/reports/TransactionRow";
import { DailySummaryModal } from "@/components/reports/DailySummaryModal";
import { useReportMetrics, FilterKey, DateRange } from "@/hooks/useReportMetrics";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";
import { D } from "@/constants/theme";

// ── Formatting utility ────────────────────────────────────────────────────────
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

// ── Sale row sub-component ────────────────────────────────────────────────────
function SaleRow({ sale, isLast }: { sale: Sale; isLast: boolean }) {
  const { t } = useTranslation();
  const remaining = sale.amount - sale.paid;
  const statusColor =
    sale.status === "paid"    ? D.emerald :
    sale.status === "partial" ? D.amber   : D.rose;
  const statusBg =
    sale.status === "paid"    ? D.emeraldBg :
    sale.status === "partial" ? D.amberBg   : D.roseBg;
  const statusLabel =
    sale.status === "paid"    ? t("reports.paid")    :
    sale.status === "partial" ? t("reports.partial") : t("reports.due");

  const dateStr = new Date(sale.date).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
  const timeStr = new Date(sale.date).toLocaleTimeString("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[SR.row, !isLast && SR.rowBorder]}>
      <View style={SR.leftCol}>
        <Text style={SR.invoiceNum}>#{sale.invoiceNumber}</Text>
        <Text style={SR.clientName} numberOfLines={1}>{sale.customerName}</Text>
        <View style={SR.dateTimeRow}>
          <Text style={SR.date}>{dateStr}</Text>
          <View style={SR.timeBadge}>
            <Text style={SR.time}>{timeStr}</Text>
          </View>
        </View>
      </View>
      <View style={SR.rightCol}>
        <Text style={SR.amount}>MAD {fmt(sale.amount)}</Text>
        {remaining > 0 && (
          <Text style={SR.remaining}>reste MAD {fmt(remaining)}</Text>
        )}
        <View style={[SR.badge, { backgroundColor: statusBg }]}>
          <Text style={[SR.badgeTxt, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const SR = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: D.border },
  leftCol:  { flex: 1, marginRight: 10 },
  rightCol: { alignItems: "flex-end", gap: 3 },
  invoiceNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    letterSpacing: -0.2,
  },
  clientName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: D.inkMid,
    marginTop: 2,
    maxWidth: 180,
  },
  date: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: D.inkGhost,
    marginTop: 2,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  timeBadge: {
    backgroundColor: D.heroAccent + "20",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  time: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: D.heroAccent,
  },
  amount: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    letterSpacing: -0.3,
  },
  remaining: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: D.rose,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  badgeTxt: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, transactions, products, setIsSidebarOpen, userProfile, config } = useApp();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<FilterKey>("daily");
  const [activeTab, setActiveTab] = useState<"metrics" | "transactions">("metrics");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [summaryClientFilter, setSummaryClientFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { filteredSales, filteredTransactions, financials, statusCounts, truckStock } =
    useReportMetrics(sales, transactions, products, filter, dateRange);

  // ── Unique client list from filteredSales ────────────────────────────────
  const uniqueClients = useMemo(() => {
    const names = Array.from(new Set(filteredSales.map(s => s.customerName))).sort();
    return names;
  }, [filteredSales]);

  // ── Filtered client list for dropdown ─────────────────────────────────────
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return uniqueClients;
    const q = clientSearch.toLowerCase().trim();
    return uniqueClients.filter(name => name.toLowerCase().includes(q));
  }, [uniqueClients, clientSearch]);

  // ── Sales filtered by selected client + search ───────────────────────────
  const clientFilteredSales = useMemo(() => {
    let list = filteredSales;
    if (clientFilter !== "all") {
      list = list.filter(s => s.customerName === clientFilter);
    }
    if (clientSearch.trim()) {
      const q = clientSearch.trim().toLowerCase();
      list = list.filter(s =>
        s.customerName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSales, clientFilter, clientSearch]);

  // ── Client-filtered totals ───────────────────────────────────────────────
  const clientTotals = useMemo(() => {
    const total   = clientFilteredSales.reduce((s, x) => s + x.amount, 0);
    const paid    = clientFilteredSales.reduce((s, x) => s + x.paid, 0);
    const remaining = total - paid;
    return { total, paid, remaining };
  }, [clientFilteredSales]);

  const {
    printDailySummary,
    exportDailySummaryPdf,
    isConnecting,
    isPrinting,
    isSuccess,
    currentPrinter,
  } = usePrintInvoice();

  const periodLabel = useMemo(() => {
    if (filter === "custom" && dateRange) {
      const fmt = (d: Date) => d.toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit" });
      return `${fmt(dateRange.start)} - ${fmt(dateRange.end)}`;
    }
    const map: Record<FilterKey, string> = {
      daily:   "Aujourd'hui",
      weekly:  "Cette semaine",
      monthly: "Ce mois-ci",
      all:     "Tout",
      custom:  "Personnalisé",
    };
    return map[filter];
  }, [filter, dateRange]);

  const summaryData = useMemo(() => ({
    totalSales:     financials.totalRevenue,
    cashCollected:  financials.cashCollected,
    customerCredit: financials.customerCredit,
    stockValue:     truckStock.value,
    salesCount:     filteredSales.length,
    periodLabel,
    vendorName:     userProfile?.name || userProfile?.username,
    truckLabel:     config.truckLocation,
    sales:          filteredSales,
    clientFilter:   summaryClientFilter !== "all" ? summaryClientFilter : undefined,
    dateRange:      dateRange,
  }), [financials, truckStock, filteredSales, periodLabel, userProfile, config, summaryClientFilter, dateRange]);

  // ── Filter pills config ──────────────────────────────────────────────────
  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "daily",   label: t("reports.daily") },
    { key: "weekly",  label: t("reports.weekly") },
    { key: "monthly", label: t("reports.monthly") },
    { key: "all",     label: t("reports.all") },
    { key: "custom",  label: t("reports.custom") || "Date" },
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
    if (key === "custom") {
      setShowDatePicker(true);
    } else {
      setFilter(key);
      setDateRange(undefined);
    }
  }, []);

  const handleOpenDatePicker = useCallback(() => {
    setDatePickerMode("start");
    setTempStartDate(dateRange?.start || new Date());
    setTempEndDate(dateRange?.end || new Date());
    setShowDatePicker(true);
  }, [dateRange]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (datePickerMode === "start") {
        setTempStartDate(selectedDate);
        setDatePickerMode("end");
      } else {
        setTempEndDate(selectedDate);
      }
    }
  }, [datePickerMode]);

  const handleConfirmDateRange = useCallback(() => {
    setDateRange({ start: tempStartDate, end: tempEndDate });
    setFilter("custom");
    setShowDatePicker(false);
  }, [tempStartDate, tempEndDate]);

  const handleCancelDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const handleTabChange = useCallback(
    (tab: "metrics" | "transactions") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(tab);
    },
    []
  );

  const handleClientFilter = useCallback((name: string) => {
    Haptics.selectionAsync();
    setClientFilter(name);
    setSummaryClientFilter(name);
  }, []);

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

  const handleShareSummary = useCallback(async () => {
    const uri = await exportDailySummaryPdf(summaryData);
    if (!uri) {
      Toast.show("Erreur lors de l'export PDF", { duration: 2000, backgroundColor: D.rose });
    }
  }, [exportDailySummaryPdf, summaryData]);

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
        {(["metrics", "transactions"] as const).map((tab) => {
          const icon = tab === "metrics" ? "pie-chart" : "list";
          const label = tab === "metrics" ? t("reports.metrics") : t("reports.logs");
          return (
            <TouchableOpacity
              key={tab}
              style={[S.tabBtn, activeTab === tab && S.tabBtnActive]}
              onPress={() => handleTabChange(tab)}
            >
              <Feather
                name={icon}
                size={14}
                color={activeTab === tab ? D.heroAccent : D.inkSoft}
                style={{ marginRight: 5 }}
              />
              <Text style={[S.tabTxt, activeTab === tab && S.tabTxtActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
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

          {/* Client filter dropdown */}
          <View style={S.section}>
            <SectionHeader
              title={t("reports.filterByClient")}
              dotColor={D.heroAccent}
            />
            <TouchableOpacity
              style={S.dropdownTrigger}
              onPress={() => setShowClientDropdown(true)}
            >
              <View style={S.dropdownTriggerContent}>
                <Feather name="users" size={16} color={D.heroAccent} />
                <Text style={S.dropdownTriggerText}>
                  {clientFilter === "all" 
                    ? `${t("reports.allClients")} (${filteredSales.length})` 
                    : `${clientFilter} (${filteredSales.filter(s => s.customerName === clientFilter).length})`}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={D.inkSoft} />
            </TouchableOpacity>
          </View>

          {/* Totals strip */}
          {clientFilteredSales.length > 0 && (
            <View style={S.totalStrip}>
              <View style={S.totalStripItem}>
                <Text style={S.totalStripLbl}>Total</Text>
                <Text style={[S.totalStripVal, { color: D.ink }]}>MAD {fmt(clientTotals.total)}</Text>
              </View>
              <View style={S.totalStripDivider} />
              <View style={S.totalStripItem}>
                <Text style={S.totalStripLbl}>Encaissé</Text>
                <Text style={[S.totalStripVal, { color: D.emerald }]}>MAD {fmt(clientTotals.paid)}</Text>
              </View>
              <View style={S.totalStripDivider} />
              <View style={S.totalStripItem}>
                <Text style={S.totalStripLbl}>Reste</Text>
                <Text style={[S.totalStripVal, { color: D.rose }]}>MAD {fmt(clientTotals.remaining)}</Text>
              </View>
            </View>
          )}

          {/* Sales list */}
          {clientFilteredSales.length === 0 ? (
            <EmptyTransactions label={t("reports.noSales")} />
          ) : (
            <View style={S.section}>
              <SectionHeader title={t("reports.salesList")} dotColor={D.heroAccent} />
              <View style={S.txCard}>
                {clientFilteredSales.map((sale, index) => (
                  <SaleRow key={sale.id} sale={sale} isLast={index === clientFilteredSales.length - 1} />
                ))}
              </View>
            </View>
          )}
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

      {/* ── Client Dropdown Modal ── */}
      <Modal visible={showClientDropdown} transparent animationType="slide" onRequestClose={() => { setShowClientDropdown(false); setClientSearch(""); }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={S.overlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setShowClientDropdown(false); setClientSearch(""); }} />
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeader}>
              <Text style={S.sheetTitle}>{t("reports.selectClient")}</Text>
              <TouchableOpacity onPress={() => { setShowClientDropdown(false); setClientSearch(""); }}>
                <Feather name="x" size={20} color={D.inkSoft} />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={S.searchWrap}>
              <Feather name="search" size={15} color={D.inkSoft} style={{ marginRight: 8 }} />
              <TextInput
                style={S.searchInput}
                placeholder={t("reports.searchClient")}
                placeholderTextColor={D.inkGhost}
                value={clientSearch}
                onChangeText={setClientSearch}
                autoFocus
              />
              {clientSearch.length > 0 && (
                <TouchableOpacity onPress={() => setClientSearch("")}>
                  <Feather name="x" size={15} color={D.inkSoft} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={S.dropdownList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={S.dropdownItem}
                onPress={() => { handleClientFilter("all"); setShowClientDropdown(false); setClientSearch(""); }}
              >
                <Text style={S.dropdownItemText}>{t("reports.allClients")}</Text>
                <Text style={S.dropdownItemCount}>({filteredSales.length})</Text>
              </TouchableOpacity>
              {filteredClients.length === 0 ? (
                <View style={S.emptySearch}>
                  <Text style={S.emptySearchText}>{t("reports.noClientFound")}</Text>
                </View>
              ) : (
                filteredClients.map(name => {
                  const count = filteredSales.filter(s => s.customerName === name).length;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={S.dropdownItem}
                      onPress={() => { handleClientFilter(name); setShowClientDropdown(false); setClientSearch(""); }}
                    >
                      <Text style={S.dropdownItemText}>{name}</Text>
                      <Text style={S.dropdownItemCount}>({count})</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Date Range Picker Modal ── */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={handleCancelDatePicker}>
        <Pressable style={S.modalBackdrop} onPress={handleCancelDatePicker} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.datePickerContainer}>
          <View style={S.datePickerContent}>
            <View style={S.datePickerHeader}>
              <Text style={S.datePickerTitle}>{t("reports.selectDateRange") || "Sélectionner la période"}</Text>
              <TouchableOpacity onPress={handleCancelDatePicker}>
                <Feather name="x" size={20} color={D.ink} />
              </TouchableOpacity>
            </View>
            
            <View style={S.datePickerRow}>
              <View style={S.datePickerField}>
                <Text style={S.datePickerLabel}>{t("reports.startDate") || "Date début"}</Text>
                <TouchableOpacity style={S.datePickerButton} onPress={() => { setDatePickerMode("start"); }}>
                  <Feather name="calendar" size={16} color={D.heroAccent} />
                  <Text style={S.datePickerText}>
                    {tempStartDate.toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={S.datePickerField}>
                <Text style={S.datePickerLabel}>{t("reports.endDate") || "Date fin"}</Text>
                <TouchableOpacity style={S.datePickerButton} onPress={() => { setDatePickerMode("end"); }}>
                  <Feather name="calendar" size={16} color={D.heroAccent} />
                  <Text style={S.datePickerText}>
                    {tempEndDate.toLocaleDateString("fr-MA", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={S.datePickerButtons}>
              <TouchableOpacity style={S.datePickerCancelBtn} onPress={handleCancelDatePicker}>
                <Text style={S.datePickerCancelTxt}>{t("common.cancel") || "Annuler"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.datePickerConfirmBtn} onPress={handleConfirmDateRange}>
                <Text style={S.datePickerConfirmTxt}>{t("common.confirm") || "Confirmer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Daily Summary Print Modal ── */}
      <DailySummaryModal
        visible={showPrintModal}
        data={summaryData}
        isPrinting={isPrinting}
        isConnecting={isConnecting}
        isSuccess={isSuccess}
        printerName={currentPrinter?.name}
        onPrint={handlePrint}
        onShare={handleShareSummary}
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

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: D.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.ink,
  },

  // Client filter pills
  clientScrollWrap: { flexGrow: 0 },
  clientScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: "row",
  },
  clientPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
    maxWidth: 160,
  },
  clientPillActive: {
    backgroundColor: D.heroAccent,
    borderColor: D.heroAccent,
  },
  clientPillTxt: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: D.inkMid,
  },
  clientPillTxtActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },

  // Totals strip
  totalStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
  },
  totalStripItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
  },
  totalStripDivider: {
    width: 1,
    backgroundColor: D.border,
    marginVertical: 8,
  },
  totalStripLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: D.inkGhost,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalStripVal: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },

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

  // Dropdown
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    padding: 14,
  },
  dropdownTriggerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: D.ink,
  },
  dropdownList: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    marginTop: 8,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: D.ink,
  },
  dropdownItemCount: {
    fontSize: 12,
    color: D.inkSoft,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: D.ink,
  },

  // Empty search
  emptySearch: {
    padding: 20,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 14,
    color: D.inkSoft,
  },

  // Date Picker Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  datePickerContent: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: D.ink,
  },
  datePickerRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  datePickerField: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: D.inkSoft,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: D.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    padding: 12,
  },
  datePickerText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: D.ink,
  },
  datePickerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  datePickerCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: D.surface,
  },
  datePickerCancelTxt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  datePickerConfirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: D.heroAccent,
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerConfirmTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
