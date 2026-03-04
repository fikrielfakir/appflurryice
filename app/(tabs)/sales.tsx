import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, Alert, Share, Image, TextInput, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp, Sale } from "@/context/AppContext";
import { Colors } from "@/constants";
import { AppHeader } from "@/components/common/AppHeader";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SaleCard({ sale, onDelete, onShare, theme: C }: {
  sale: Sale;
  onDelete: () => void;
  onShare: () => void;
  theme: any;
}) {
  const due = sale.amount - sale.paid;

  function statusColor(s: string) {
    if (s === "paid") return "#4CAF50";
    if (s === "partial") return C.warning;
    return C.danger;
  }

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(sale.status) }]}>
          <Text style={styles.statusText}>{sale.status.toUpperCase()}</Text>
        </View>
        <Text style={[styles.invoiceDate, { color: C.textSecondary }]}>
          {new Date(sale.date).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>

      <Text style={[styles.invoiceNumber, { color: C.textPrimary }]}>Invoice #.{sale.invoiceNumber}</Text>

      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountChip, { color: C.accent }]}>MAD {fmt(sale.amount)}</Text>
          <Text style={[styles.amountLabel, { color: C.textMuted }]}>Total Amount</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountChipLight, { color: C.textPrimary }, due > 0 && { color: C.warning }]}>
            MAD {fmt(sale.paid)}
          </Text>
          <Text style={[styles.amountLabel, { color: C.textMuted }]}>Paid</Text>
        </View>
      </View>

      <View style={[styles.cardMeta, { borderTopColor: C.border }]}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaKey, { color: C.textSecondary }]}>Customer:</Text>
          <Text style={[styles.metaVal, { color: C.textPrimary }]}>{sale.customerName}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.metaKey, { color: C.textSecondary }]}>Status:</Text>
          <Text style={[styles.metaVal, { color: statusColor(sale.status), fontWeight: '700' }]}>
            {sale.status === 'paid' ? 'Paid' : sale.status === 'partial' ? 'Partial' : 'Unpaid'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.metaKey, { color: C.textSecondary }]}>Due:</Text>
          <Text style={[styles.metaVal, { color: due > 0 ? C.danger : C.success }]}>
            MAD {fmt(due)}
          </Text>
        </View>
        {sale.customerPhone ? (
          <View style={styles.metaItem}>
            <Text style={[styles.metaKey, { color: C.textSecondary }]}>Phone:</Text>
            <Text style={[styles.metaVal, { color: C.textPrimary }]}>{sale.customerPhone}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Text style={[styles.metaKey, { color: C.textSecondary }]}>Method:</Text>
          <Text style={[styles.metaVal, { color: C.textPrimary }]}>{sale.paymentMethod}</Text>
        </View>
      </View>

      <View style={[styles.cardActions, { borderTopColor: C.border }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={() => Alert.alert("Return", "Return flow coming soon.")}>
          <Feather name="corner-up-left" size={16} color={C.warning} />
        </TouchableOpacity>
        {sale.customerPhone ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={() => {
            const phoneNumber = sale.customerPhone;
            if (Platform.OS === 'web') {
              window.open(`tel:${phoneNumber}`);
            } else {
              import('react-native').then(({ Linking }) => {
                Linking.openURL(`tel:${phoneNumber}`);
              });
            }
          }}>
            <Feather name="phone" size={16} color={C.success} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={onShare}>
          <Feather name="share-2" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={() => {
          router.push({
            pathname: "/pos/invoice",
            params: {
              invoiceNumber: sale.invoiceNumber,
              customerName: sale.customerName,
              customerPhone: sale.customerPhone || "",
              total: sale.amount.toString(),
              paid: sale.paid.toString(),
              remaining: (sale.amount - sale.paid).toString(),
              status: sale.status,
              paymentMethod: sale.paymentMethod,
              date: sale.date,
              itemsJson: JSON.stringify(sale.items),
              discount: "0"
            }
          });
        }}>
          <Feather name="printer" size={16} color={C.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={C.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.surface }]} onPress={() => {
          router.push({
            pathname: "/(tabs)/products",
            params: { editSaleId: sale.id }
          });
        }}>
          <Feather name="edit-2" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

import Toast from 'react-native-root-toast';

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { sales, deleteSale, totalSales, syncData, isSyncing, setIsSidebarOpen } = useApp();
  const C = Colors;
  const [filter, setFilter] = useState<"all" | "paid" | "partial" | "due">("all");

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = filter === "all" ? sales : sales.filter(s => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => 
        s.customerName.toLowerCase().includes(q) || 
        s.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sales, filter, search]);

  const paidCount = sales.filter(s => s.status === "paid").length;
  const dueCount = sales.filter(s => s.status === "due" || s.status === "partial").length;

  async function handleShare(sale: Sale) {
    try {
      const text = [
        `Invoice #${sale.invoiceNumber}`,
        `Customer: ${sale.customerName}`,
        `Total: MAD ${fmt(sale.amount)}`,
        `Paid: MAD ${fmt(sale.paid)}`,
        `Status: ${sale.status.toUpperCase()}`,
        ...sale.items.map(i => `  ${i.name} x${i.qty} = MAD ${fmt(i.qty * i.price)}`),
      ].join("\n");
      await Share.share({ message: text });
    } catch (e) {}
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <AppHeader 
        title="Historique des ventes"
        dark
        showMenu
        onMenuPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsSidebarOpen(true);
        }}
        rightActions={
          <>
            <TouchableOpacity 
              style={[styles.cartBtn, isSyncing && styles.cartBtnDisabled]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                syncData();
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="cloud" size={22} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cartBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
               <Feather name="printer" size={22} color="#fff" />
            </TouchableOpacity>
          </>
        }
      />

      <View style={[styles.searchBarWrapper, { backgroundColor: C.primary }]}>
        <View style={[styles.searchRow, { backgroundColor: C.surface }]}>
          <Feather name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Rechercher..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSyncing && (
        <View style={[styles.syncIndicator, { backgroundColor: C.accent }]}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncIndicatorText}>Synchronisation en cours...</Text>
        </View>
      )}

      <View style={[styles.statsStrip, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={styles.filterContainer}>
          {(["all", "paid", "partial", "due"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { backgroundColor: C.card, borderColor: C.border }, filter === f && { backgroundColor: C.accent + "20", borderColor: C.accent }]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            >
              <Text style={[styles.filterText, { color: C.textSecondary }, filter === f && { color: C.accent }]}>
                {f === "all" ? "Tout" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.headerStats, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: "#4CAF50" }]}>{paidCount}</Text>
            <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>Payé</Text>
          </View>
          <View style={[styles.headerStatDivider, { backgroundColor: C.border }]} />
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: C.warning }]}>{dueCount}</Text>
            <Text style={[styles.headerStatLabel, { color: C.textSecondary }]}>Impayé</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + bottomInset }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SaleCard
            theme={C}
            sale={item}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Delete Sale", "Remove this invoice?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {
                  deleteSale(item.id);
                  Toast.show("Vente supprimée", { duration: Toast.durations.SHORT });
                }},
              ]);
            }}
            onShare={() => handleShare(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt" size={44} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No sales found</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncIndicatorText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerLeftPlaceholder: {
    width: 36,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  cartBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtnDisabled: {
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  headerStats: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 6, gap: 8, borderWidth: 1 },
  headerStat: { alignItems: "center", minWidth: 35 },
  headerStatNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  headerStatLabel: { fontSize: 8, fontFamily: "Inter_400Regular" },
  headerStatDivider: { width: 1, height: 16 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  invoiceDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  invoiceNumber: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12, textAlign: "right" },
  amountsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  amountBlock: { flex: 1 },
  amountChip: { fontSize: 15, fontFamily: "Inter_700Bold" },
  amountChipLight: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  amountLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardMeta: { gap: 4, marginBottom: 12, borderTopWidth: 1, paddingTop: 12 },
  metaItem: { flexDirection: "row", gap: 6 },
  metaKey: { fontSize: 12, fontFamily: "Inter_400Regular", width: 70 },
  metaVal: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  cardActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", borderTopWidth: 1, paddingTop: 12 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});