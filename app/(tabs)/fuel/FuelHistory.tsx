import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useFuel } from "@/context/FuelContext";
import { FuelEntry } from "@/context/AppContext";
import { D } from "@/constants/theme";
import { calcMonthConsumption, deriveEntriesWithConsumption } from "@/utils/fuel";

const FUEL_ACCENT = "#22c55e";

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MonthSection {
  title: string;
  data: FuelEntry[];
  totalLiters: number;
  totalCost: number;
  avgConsumption: number;
}

export function FuelHistory() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { entries, deleteEntry, refreshEntries } = useFuel();
  const [refreshing, setRefreshing] = React.useState(false);

  const entriesWithConsumption = useMemo(
    () => deriveEntriesWithConsumption(entries),
    [entries],
  );

  const sections = useMemo((): MonthSection[] => {
    const grouped: Record<string, FuelEntry[]> = {};
    
    entriesWithConsumption.forEach(entry => {
      const d = new Date(entry.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    const monthKeys = Object.keys(grouped).sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return new Date(ay, am).getTime() - new Date(by, bm).getTime();
    });

    return monthKeys.map(key => {
      const data = grouped[key];
      const [year, month] = key.split("-").map(Number);
      const monthStart = new Date(year, month);
      const title = monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      
      const totalLiters = data.reduce((sum, e) => sum + e.liters, 0);
      const totalCost = data.reduce((sum, e) => sum + e.totalCost, 0);

      const prevEntries = entriesWithConsumption.filter(e => new Date(e.date) < monthStart);
      const prevLast = prevEntries.length > 0 ? prevEntries[prevEntries.length - 1] : undefined;
      const avgConsumption = calcMonthConsumption(data, prevLast);

      return { title, data, totalLiters, totalCost, avgConsumption };
    });
  }, [entriesWithConsumption]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  }, [refreshEntries]);

  const handleDelete = (entry: FuelEntry) => {
    Alert.alert(
      t("fuel.deleteEntry"),
      t("fuel.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { 
          text: t("common.delete"), 
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deleteEntry(entry.id);
          }
        }
      ]
    );
  };

  const renderEntry = ({ item }: { item: FuelEntry }) => {
    const dateStr = new Date(item.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
    return (
      <TouchableOpacity style={S.entryRow} onLongPress={() => handleDelete(item)}>
        <View style={S.entryLeft}>
          <View style={[S.entryIcon, { backgroundColor: D.emeraldBg }]}>
            <MaterialCommunityIcons name="gas-station" size={18} color={FUEL_ACCENT} />
          </View>
          <View style={S.entryInfo}>
            <Text style={S.entryDate}>{dateStr}</Text>
            <Text style={S.entryOdometer}>{item.odometer.toLocaleString()} km</Text>
          </View>
        </View>
        <View style={S.entryRight}>
          <Text style={S.entryLiters}>{item.liters.toFixed(1)} L</Text>
          <Text style={S.entryCost}>MAD {fmt(item.totalCost)}</Text>
          {item.consumption && (
            <View style={[S.consumptionBadge, { backgroundColor: item.consumption < 15 ? D.emeraldBg : D.amberBg }]}>
              <Text style={[S.consumptionTxt, { color: item.consumption < 15 ? D.emerald : D.amber }]}>
                {item.consumption.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: MonthSection }) => (
    <View style={S.sectionHeader}>
      <Text style={S.sectionTitle}>{section.title}</Text>
      <View style={S.sectionStats}>
        <Text style={S.sectionStat}>{section.totalLiters.toFixed(1)} L</Text>
        <Text style={S.sectionStat}>MAD {fmt(section.totalCost)}</Text>
        <Text style={S.sectionStat}>{section.avgConsumption > 0 ? `${section.avgConsumption.toFixed(1)} L/100km` : ""}</Text>
      </View>
    </View>
  );

  const flatListData = sections.flatMap(section => [
    { type: "header" as const, section },
    ...section.data.map(item => ({ type: "item" as const, item })),
  ]);

  const renderItem = ({ item }: { item: { type: "header"; section: MonthSection } | { type: "item"; item: FuelEntry } }) => {
    if (item.type === "header") {
      return renderSectionHeader({ section: item.section });
    }
    return renderEntry({ item: item.item });
  };

  return (
    <View style={S.container}>
      {entries.length === 0 ? (
        <View style={S.emptyState}>
          <MaterialCommunityIcons name="gas-station-outline" size={64} color={D.inkGhost} />
          <Text style={S.emptyTitle}>{t("fuel.noHistory")}</Text>
          <Text style={S.emptySubtitle}>{t("fuel.addFirstEntry")}</Text>
        </View>
      ) : (
        <FlatList
          data={flatListData}
          keyExtractor={(item, index) => item.type === "header" ? `header-${index}` : item.item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[FUEL_ACCENT]} />
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.bg },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: D.ink, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: D.inkSoft, marginTop: 8, textAlign: "center" },
  sectionHeader: { 
    backgroundColor: D.surface, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginBottom: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },
  sectionStats: { flexDirection: "row", marginTop: 6 },
  sectionStat: { fontSize: 11, color: D.inkSoft, marginRight: 16 },
  entryRow: { 
    backgroundColor: D.surface, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 8,
  },
  entryLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  entryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  entryInfo: { flex: 1 },
  entryDate: { fontSize: 14, fontFamily: "Inter_500Medium", color: D.ink },
  entryOdometer: { fontSize: 12, color: D.inkSoft, marginTop: 2 },
  entryRight: { alignItems: "flex-end" },
  entryLiters: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  entryCost: { fontSize: 12, color: D.inkSoft, marginTop: 2 },
  consumptionBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  consumptionTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
