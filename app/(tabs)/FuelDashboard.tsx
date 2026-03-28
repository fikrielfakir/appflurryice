import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";
import { useFuel } from "@/context/FuelContext";
import { useApp } from "@/context/AppContext";
import { FuelEntry } from "@/context/AppContext";
import { D } from "@/constants/theme";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";
import { FuelSummaryModal } from "./FuelSummaryModal";
import { calcAvgConsumption } from "@/utils/fuel";

interface FuelDashboardProps {
  filteredEntries?: FuelEntry[];
  activeDateRange?: { from: Date; to: Date };
}

const FUEL_PRIMARY = "#1a3a2a";
const FUEL_ACCENT = "#22c55e";

const STATIONS = [
  "Afriquia",
  "Shell",
  "Total",
  "Winxo",
  "Petromin",
  "Ola Energy",
  "Ziz",
  "Green Oil",
  "Somepi",
  "CMH",
];

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={S.metricCard}>
      <Text style={[S.metricValue, { color }]}>{value}</Text>
      <Text style={S.metricUnit}>{unit}</Text>
      <Text style={S.metricLabel}>{label}</Text>
    </View>
  );
}

function FillUpCard({ entry }: { entry: FuelEntry }) {
  const dateStr = new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return (
    <View style={S.fillUpCard}>
      <View style={S.fillUpTop}>
        <View style={S.fillUpIcon}>
          <MaterialCommunityIcons name="gas-station" size={20} color={FUEL_ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.fillUpDate}>{dateStr}</Text>
          <Text style={S.fillUpOdometer}>{entry.odometer.toLocaleString()} km</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={S.fillUpLiters}>{entry.liters.toFixed(1)} L</Text>
          <Text style={S.fillUpPrice}>{fmt(entry.pricePerLiter)} MAD/L</Text>
        </View>
      </View>
      <View style={S.fillUpBottom}>
        <Text style={S.fillUpTotal}>MAD {fmt(entry.totalCost)}</Text>
        {entry.consumption && (
          <View style={[S.consumptionBadge, { backgroundColor: entry.consumption < 15 ? D.emeraldBg : D.amberBg }]}>
            <Text style={[S.consumptionTxt, { color: entry.consumption < 15 ? D.emerald : D.amber }]}>
              {entry.consumption.toFixed(1)} L/100km
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function FuelDashboard({ filteredEntries, activeDateRange }: FuelDashboardProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries, budget, addEntry, refreshEntries } = useFuel();
  const { userProfile } = useApp();
  const { printFuelReceipt, isConnecting, isPrinting, isSuccess } = usePrintInvoice();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("14.50");
  const [odometer, setOdometer] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [station, setStation] = useState("");
  const [showStationPicker, setShowStationPicker] = useState(false);

  const now = useMemo(() => new Date(), []);

  const currentMonthEntries = useMemo(() => {
    if (filteredEntries) return filteredEntries;
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [entries, now, filteredEntries]);

  const monthlyTotals = useMemo(() => {
    const totalLiters = currentMonthEntries.reduce((sum, e) => sum + e.liters, 0);
    const totalCost = currentMonthEntries.reduce((sum, e) => sum + e.totalCost, 0);
    const avgConsumption = calcAvgConsumption(currentMonthEntries);
    return { totalLiters, totalCost, avgConsumption };
  }, [currentMonthEntries]);

  const budgetUsage = useMemo(() => {
    if (!budget) return 0;
    return (monthlyTotals.totalCost / budget.monthlyLimit) * 100;
  }, [budget, monthlyTotals.totalCost]);

  const lastTwoEntries = useMemo(() => {
    return [...currentMonthEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2);
  }, [currentMonthEntries]);

  const handleSave = async () => {
    if (!liters || !odometer) {
      Toast.show(t("fuel.fillRequired"), { duration: 2000, backgroundColor: D.rose });
      return;
    }
    setIsSaving(true);
    try {
      await addEntry({
        truckId: "TRUCK-01",
        date: date.toISOString(),
        liters: parseFloat(liters),
        pricePerLiter: parseFloat(pricePerLiter) || 14.50,
        totalCost: parseFloat(liters) * (parseFloat(pricePerLiter) || 14.50),
        odometer: parseInt(odometer),
        station: station || undefined,
        vendorId: userProfile?.name || "Vendor",
      });
      Toast.show(t("fuel.entryAdded"), { duration: 2000, backgroundColor: D.emerald });
      setShowAddModal(false);
      resetForm();
    } catch (e) {
      Toast.show(t("common.error"), { duration: 2000, backgroundColor: D.rose });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setLiters("");
    setOdometer("");
    setStation("");
    setDate(new Date());
  };

  const liveTotal = (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);

  return (
    <View style={S.container}>
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Metrics */}
        <View style={S.metricsRow}>
          <View style={[S.metricCard, { flex: 1, backgroundColor: FUEL_PRIMARY }]}>
            <Text style={[S.metricValue, { color: "#fff" }]}>{monthlyTotals.totalLiters.toFixed(1)}</Text>
            <Text style={[S.metricUnit, { color: "rgba(255,255,255,0.7)" }]}>Litres</Text>
            <Text style={[S.metricLabel, { color: "rgba(255,255,255,0.8)" }]}>{t("fuel.thisMonth")}</Text>
          </View>
          <View style={[S.metricCard, { flex: 1, marginHorizontal: 8, backgroundColor: D.emerald }]}>
            <Text style={[S.metricValue, { color: "#fff" }]}>{fmt(monthlyTotals.totalCost)}</Text>
            <Text style={[S.metricUnit, { color: "rgba(255,255,255,0.7)" }]}>MAD</Text>
            <Text style={[S.metricLabel, { color: "rgba(255,255,255,0.8)" }]}>{t("fuel.totalCost")}</Text>
          </View>
          <View style={[S.metricCard, { flex: 1, backgroundColor: D.amber }]}>
            <Text style={[S.metricValue, { color: "#fff" }]}>{monthlyTotals.avgConsumption > 0 ? monthlyTotals.avgConsumption.toFixed(1) : "--"}</Text>
            <Text style={[S.metricUnit, { color: "rgba(255,255,255,0.7)" }]}>L/100km</Text>
            <Text style={[S.metricLabel, { color: "rgba(255,255,255,0.8)" }]}>{t("fuel.consumption")}</Text>
          </View>
        </View>

        {/* Budget Progress */}
        {budget && (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>{t("fuel.budget")}</Text>
              <Text style={[S.budgetPct, { color: budgetUsage > (budget.alertThreshold || 70) ? D.rose : D.emerald }]}>
                {budgetUsage.toFixed(0)}%
              </Text>
            </View>
            <View style={S.progressBar}>
              <View style={[S.progressFill, { width: `${Math.min(budgetUsage, 100)}%`, backgroundColor: budgetUsage > (budget.alertThreshold || 70) ? D.rose : FUEL_ACCENT }]} />
            </View>
            <View style={S.budgetLabels}>
              <Text style={S.budgetLabel}>{t("fuel.spent")}: {fmt(monthlyTotals.totalCost)} MAD</Text>
              <Text style={S.budgetLabel}>{t("fuel.limit")}: {fmt(budget.monthlyLimit)} MAD</Text>
            </View>
            {budgetUsage > (budget.alertThreshold || 70) && (
              <View style={[S.alertBanner, { backgroundColor: D.amberBg }]}>
                <Feather name="alert-triangle" size={16} color={D.amber} />
                <Text style={[S.alertTxt, { color: D.amber }]}>{t("fuel.budgetWarning")}</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Fill-ups */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>{t("fuel.recentFillUps")}</Text>
          {lastTwoEntries.length === 0 ? (
            <View style={S.emptyState}>
              <MaterialCommunityIcons name="gas-station-outline" size={48} color={D.inkGhost} />
              <Text style={S.emptyTxt}>{t("fuel.noEntries")}</Text>
            </View>
          ) : (
            lastTwoEntries.map((entry) => (
              <FillUpCard key={entry.id} entry={entry} />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[S.fab, { bottom: insets.bottom + 100 }]} onPress={() => setShowAddModal(true)}>
        <LinearGradient colors={[FUEL_PRIMARY, FUEL_ACCENT]} style={S.fabGradient}>
         <MaterialCommunityIcons name="gas-station-outline" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={S.modalOverlay}>
          <View style={[S.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>{t("fuel.addEntry")}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={D.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={S.inputGroup}>
                <Text style={S.inputLabel}>{t("fuel.liters")} *</Text>
                <TextInput
                  style={S.input}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  value={liters}
                  onChangeText={setLiters}
                  placeholderTextColor={D.inkGhost}
                />
              </View>

              <View style={S.inputGroup}>
                <Text style={S.inputLabel}>{t("fuel.pricePerLiter")}</Text>
                <TextInput
                  style={S.input}
                  placeholder="14.50"
                  keyboardType="decimal-pad"
                  value={pricePerLiter}
                  onChangeText={setPricePerLiter}
                  placeholderTextColor={D.inkGhost}
                />
              </View>

              <View style={S.inputGroup}>
                <Text style={S.inputLabel}>{t("fuel.odometer")} *</Text>
                <TextInput
                  style={S.input}
                  placeholder="0"
                  keyboardType="number-pad"
                  value={odometer}
                  onChangeText={setOdometer}
                  placeholderTextColor={D.inkGhost}
                />
              </View>

              <View style={S.inputGroup}>
                <Text style={S.inputLabel}>{t("fuel.date")}</Text>
                <TouchableOpacity style={S.input} onPress={() => setShowDatePicker(true)}>
                  <Text style={S.inputText}>{date.toLocaleDateString("fr-FR")}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
                  />
                )}
              </View>

              <View style={S.inputGroup}>
                <Text style={S.inputLabel}>{t("fuel.station")}</Text>
                <TouchableOpacity 
                  style={[S.input, S.pickerBtn]}
                  onPress={() => setShowStationPicker(true)}
                >
                  <Text style={[S.inputText, !station && S.placeholder]}>
                    {station || t("fuel.stationPlaceholder")}
                  </Text>
                  <Feather name="chevron-down" size={18} color={D.inkSoft} />
                </TouchableOpacity>
              </View>

              <Modal visible={showStationPicker} transparent animationType="fade">
                <TouchableOpacity 
                  style={S.pickerOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowStationPicker(false)}
                >
                  <View style={S.pickerContainer}>
                    <Text style={S.pickerTitle}>{t("fuel.selectStation")}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                      {STATIONS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[S.pickerItem, station === s && S.pickerItemSelected]}
                          onPress={() => {
                            setStation(s);
                            setShowStationPicker(false);
                          }}
                        >
                          <Text style={[S.pickerItemTxt, station === s && S.pickerItemTxtSelected]}>
                            {s}
                          </Text>
                          {station === s && <Feather name="check" size={18} color={FUEL_ACCENT} />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* Live Total */}
              <View style={S.totalPreview}>
                <Text style={S.totalPreviewLabel}>{t("fuel.total")}</Text>
                <Text style={S.totalPreviewValue}>MAD {fmt(liveTotal)}</Text>
              </View>

              <TouchableOpacity style={S.saveBtn} onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={S.saveBtnTxt}>{t("common.save")}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, padding: 16 },
  metricsRow: { flexDirection: "row", marginBottom: 20 },
  metricCard: { backgroundColor: D.surface, borderRadius: 16, padding: 16, alignItems: "center" },
  metricValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  metricUnit: { fontSize: 11, color: D.inkSoft, marginTop: 2 },
  metricLabel: { fontSize: 10, color: D.inkSoft, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.ink },
  budgetPct: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressBar: { height: 8, backgroundColor: D.border, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  budgetLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  budgetLabel: { fontSize: 11, color: D.inkSoft },
  alertBanner: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginTop: 12 },
  alertTxt: { fontSize: 12, fontFamily: "Inter_500Medium", marginLeft: 8 },
  fillUpCard: { backgroundColor: D.surface, borderRadius: 14, padding: 16, marginBottom: 10 },
  fillUpTop: { flexDirection: "row", alignItems: "center" },
  fillUpIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: D.emeraldBg, justifyContent: "center", alignItems: "center", marginRight: 12 },
  fillUpDate: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  fillUpOdometer: { fontSize: 12, color: D.inkSoft },
  fillUpLiters: { fontSize: 16, fontFamily: "Inter_700Bold", color: D.ink },
  fillUpPrice: { fontSize: 11, color: D.inkSoft },
  fillUpBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: D.border },
  fillUpTotal: { fontSize: 18, fontFamily: "Inter_700Bold", color: FUEL_ACCENT },
  consumptionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  consumptionTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTxt: { fontSize: 14, color: D.inkSoft, marginTop: 12 },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: FUEL_PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: D.ink },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: D.inkMid, marginBottom: 6 },
  input: { backgroundColor: D.bg, borderRadius: 12, padding: 14, fontSize: 16, color: D.ink, borderWidth: 1, borderColor: D.border },
  inputText: { fontSize: 16, color: D.ink },
  totalPreview: { backgroundColor: D.emeraldBg, borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 16 },
  totalPreviewLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: D.ink },
  totalPreviewValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: D.emerald },
  saveBtn: { backgroundColor: FUEL_PRIMARY, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pickerBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  placeholder: { color: D.inkGhost },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 40 },
  pickerContainer: { backgroundColor: D.surface, borderRadius: 16, padding: 16, width: "100%", maxHeight: 350, overflow: "hidden" },
  pickerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.ink, marginBottom: 12, textAlign: "center" },
  pickerItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.border },
  pickerItemSelected: { backgroundColor: D.emeraldBg, borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -12 },
  pickerItemTxt: { fontSize: 15, color: D.ink },
  pickerItemTxtSelected: { color: FUEL_ACCENT, fontFamily: "Inter_600SemiBold" },
});
