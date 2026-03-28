import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { FuelDashboard } from "./FuelDashboard";
import { FuelHistory } from "./FuelHistory";
import { FuelStats } from "./FuelStats";
import { FuelSummaryModal } from "./FuelSummaryModal";
import { useFuel } from "@/context/FuelContext";
import { D } from "@/constants/theme";

const FUEL_PRIMARY = "#1a3a2a";
const FUEL_SECONDARY = "#2d4a3a";
const FUEL_ACCENT = "#22c55e";

type FilterKey = "thisMonth" | "last30" | "quarter" | "all" | "custom";

const TABS = ["dashboard", "history", "stats"] as const;
type TabKey = typeof TABS[number];

function getThisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

function getLast30DaysRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from, to };
}

function getQuarterRange() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return {
    from: new Date(now.getFullYear(), q * 3, 1),
    to: new Date(now.getFullYear(), q * 3 + 3, 0),
  };
}

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries } = useFuel();
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("thisMonth");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">("start");
  const initialRange = getThisMonthRange();
  const [tempStartDate, setTempStartDate] = useState<Date>(initialRange.from);
  const [tempEndDate, setTempEndDate] = useState<Date>(initialRange.to);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  const activeDateRange = useMemo((): { from: Date; to: Date } => {
    if (filter === "custom" && dateRange) return dateRange;
    if (filter === "thisMonth") return getThisMonthRange();
    if (filter === "last30") return getLast30DaysRange();
    if (filter === "quarter") return getQuarterRange();
    return { from: new Date(0), to: new Date() };
  }, [filter, dateRange]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      return d >= activeDateRange.from && d <= activeDateRange.to;
    });
  }, [entries, activeDateRange]);

  const periodLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(activeDateRange.from)} — ${fmt(activeDateRange.to)}`;
  }, [activeDateRange]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "thisMonth", label: t("fuel.thisMonth") },
    { key: "last30",    label: "30j" },
    { key: "quarter",    label: t("fuel.quarter") || "Trimestre" },
    { key: "all",       label: t("fuel.all") || "Tout" },
    { key: "custom",    label: t("fuel.custom") || "Date" },
  ];

  const handleFilterChange = useCallback((key: FilterKey) => {
    Haptics.selectionAsync();
    if (key === "custom") {
      setTempStartDate(activeDateRange.from);
      setTempEndDate(activeDateRange.to);
      setShowDatePicker(true);
    } else {
      setFilter(key);
      setDateRange(undefined);
    }
  }, [activeDateRange]);

  const handleDateChange = useCallback((_: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (datePickerMode === "start") {
        setTempStartDate(selectedDate);
        setDatePickerMode("end");
      } else {
        setTempEndDate(selectedDate);
        setDatePickerMode("start");
        setDateRange({ from: tempStartDate, to: selectedDate });
        setFilter("custom");
        setShowDatePicker(false);
      }
    }
  }, [datePickerMode, tempStartDate]);

  const handleConfirmDateRange = useCallback(() => {
    setDateRange({ from: tempStartDate, to: tempEndDate });
    setFilter("custom");
    setShowDatePicker(false);
    setDatePickerMode("start");
  }, [tempStartDate, tempEndDate]);

  const handleCancelDatePicker = useCallback(() => {
    setShowDatePicker(false);
    setDatePickerMode("start");
  }, []);

  const tabColors: Record<TabKey, string> = {
    dashboard: D.heroAccent,
    history: D.emerald,
    stats: D.amber,
  };

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>
      {/* Header */}
      <View style={[S.hero, { paddingTop: insets.top + 10 }]}>
        <LinearGradient colors={[FUEL_PRIMARY, FUEL_SECONDARY]} style={StyleSheet.absoluteFill} />
        <View style={S.heroContent}>
          <View style={S.heroTop}>
            <Text style={S.heroTitle}>{t("fuel.title")}</Text>
            <View style={S.headerActions}>
              <View style={S.truckBadge}>
                <Feather name="truck" size={14} color="#fff" />
              </View>
              <TouchableOpacity style={S.printBtn} onPress={() => setShowSummaryModal(true)}>
                <Feather name="printer" size={18} color="#fff" />
              </TouchableOpacity>
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
            <Text style={[S.filterTxt, filter === f.key && S.filterTxtActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date range indicator */}
      <View style={S.rangeRow}>
        <Feather name="calendar" size={13} color={FUEL_ACCENT} />
        <Text style={S.rangeLabel}>{periodLabel}</Text>
        <View style={S.rangeBadge}>
          <Text style={S.rangeBadgeTxt}>{filteredEntries.length}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[S.tabBar, { paddingBottom: insets.bottom + 10 }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[S.tab, activeTab === tab && { borderBottomColor: tabColors[tab], borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Feather
              name={tab === "dashboard" ? "grid" : tab === "history" ? "list" : "bar-chart-2"}
              size={18}
              color={activeTab === tab ? tabColors[tab] : D.inkSoft}
            />
            <Text style={[S.tabTxt, activeTab === tab && { color: tabColors[tab] }]}>
              {t(`fuel.tabs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={S.content}>
        {activeTab === "dashboard" && <FuelDashboard filteredEntries={filteredEntries} activeDateRange={activeDateRange} />}
        {activeTab === "history" && <FuelHistory filteredEntries={filteredEntries} />}
        {activeTab === "stats" && <FuelStats filteredEntries={filteredEntries} />}
      </View>

      {/* Summary Modal */}
      <FuelSummaryModal
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        filteredEntries={filteredEntries}
        monthLabel={periodLabel}
      />

      {/* Date Range Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={handleCancelDatePicker}>
        <View style={S.modalBackdrop}>
          <View style={[S.datePickerContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={S.datePickerHeader}>
              <Text style={S.datePickerTitle}>{t("fuel.selectDateRange") || "Sélectionner la période"}</Text>
              <TouchableOpacity onPress={handleCancelDatePicker}>
                <Feather name="x" size={20} color={D.ink} />
              </TouchableOpacity>
            </View>

            <View style={S.datePickerRow}>
              <View style={S.datePickerField}>
                <Text style={S.datePickerLabel}>{t("fuel.startDate") || "Date début"}</Text>
                <TouchableOpacity style={S.datePickerButton} onPress={() => setDatePickerMode("start")}>
                  <Feather name="calendar" size={16} color={FUEL_ACCENT} />
                  <Text style={S.datePickerText}>
                    {tempStartDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={S.datePickerField}>
                <Text style={S.datePickerLabel}>{t("fuel.endDate") || "Date fin"}</Text>
                <TouchableOpacity style={S.datePickerButton} onPress={() => setDatePickerMode("end")}>
                  <Feather name="calendar" size={16} color={FUEL_ACCENT} />
                  <Text style={S.datePickerText}>
                    {tempEndDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <DateTimePicker
              value={datePickerMode === "start" ? tempStartDate : tempEndDate}
              mode="date"
              maximumDate={datePickerMode === "start" ? tempEndDate : undefined}
              minimumDate={datePickerMode === "end" ? tempStartDate : undefined}
              onChange={handleDateChange}
            />

            <View style={S.datePickerButtons}>
              <TouchableOpacity style={S.datePickerCancelBtn} onPress={handleCancelDatePicker}>
                <Text style={S.datePickerCancelTxt}>{t("common.cancel") || "Annuler"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.datePickerConfirmBtn} onPress={handleConfirmDateRange}>
                <Text style={S.datePickerConfirmTxt}>{t("common.confirm") || "Confirmer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: 100, paddingHorizontal: 20, justifyContent: "center" },
  heroContent: { flex: 1, justifyContent: "center" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  truckBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  printBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },

  // Filter pills
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: D.surface,
    borderWidth: 1,
    borderColor: D.border,
  },
  filterPillActive: { backgroundColor: FUEL_PRIMARY, borderColor: FUEL_PRIMARY },
  filterTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkMid },
  filterTxtActive: { color: "#fff", fontFamily: "Inter_700Bold" },

  // Date range indicator
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  rangeLabel: { fontSize: 12, color: D.inkSoft, fontFamily: "Inter_500Medium", flex: 1 },
  rangeBadge: {
    backgroundColor: D.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rangeBadgeTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: D.emerald },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: "center", paddingBottom: 10 },
  tabTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkSoft, marginTop: 4 },
  content: { flex: 1 },

  // Date Picker Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  datePickerContent: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
  datePickerField: { flex: 1 },
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
    backgroundColor: FUEL_PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerConfirmTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
