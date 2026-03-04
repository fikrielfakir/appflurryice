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
import Colors from "@/constants/colors";

const C = Colors.light;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(s: string) {
  if (s === "paid") return "#4CAF50";
  if (s === "partial") return C.warning;
  return C.danger;
}

function SaleCard({ sale, onDelete, onShare }: {
  sale: Sale;
  onDelete: () => void;
  onShare: () => void;
}) {
  const due = sale.amount - sale.paid;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(sale.status) }]}>
          <Text style={styles.statusText}>{sale.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.invoiceDate}>
          {new Date(sale.date).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>

      <Text style={styles.invoiceNumber}>Invoice #.{sale.invoiceNumber}</Text>

      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountChip}>MAD {fmt(sale.amount)}</Text>
          <Text style={styles.amountLabel}>Total Amount</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={[styles.amountChipLight, due > 0 && { color: C.warning }]}>
            MAD {fmt(sale.paid)}
          </Text>
          <Text style={styles.amountLabel}>Paid</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaKey}>Customer:</Text>
          <Text style={styles.metaVal}>{sale.customerName}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaKey}>Status:</Text>
          <Text style={[styles.metaVal, { color: statusColor(sale.status), fontWeight: '700' }]}>
            {sale.status === 'paid' ? 'Paid' : sale.status === 'partial' ? 'Partial' : 'Unpaid'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaKey}>Due:</Text>
          <Text style={[styles.metaVal, { color: due > 0 ? C.danger : C.success }]}>
            MAD {fmt(due)}
          </Text>
        </View>
        {sale.customerPhone ? (
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Phone:</Text>
            <Text style={styles.metaVal}>{sale.customerPhone}</Text>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <Text style={styles.metaKey}>Method:</Text>
          <Text style={styles.metaVal}>{sale.paymentMethod}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Return", "Return flow coming soon.")}>
          <Feather name="corner-up-left" size={16} color={C.warning} />
        </TouchableOpacity>
        {sale.customerPhone ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => {
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
        <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
          <Feather name="share-2" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {
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
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={C.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {
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
  const { sales, deleteSale, totalSales, syncData, isSyncing } = useApp();
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
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeftPlaceholder} />
          <Text style={styles.headerTitle}>Historique des ventes</Text>
          <View style={styles.headerActions}>
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
          </View>
        </View>

        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
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
        <View style={styles.syncIndicator}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncIndicatorText}>Synchronisation en cours...</Text>
        </View>
      )}

      <View style={styles.statsStrip}>
        <View style={styles.filterContainer}>
          {(["all", "paid", "partial", "due"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "Tout" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: "#4CAF50" }]}>{paidCount}</Text>
            <Text style={styles.headerStatLabel}>Payé</Text>
          </View>
          <View style={styles.headerStatDivider} />
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: C.warning }]}>{dueCount}</Text>
            <Text style={styles.headerStatLabel}>Impayé</Text>
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
            <Text style={styles.emptyText}>No sales found</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.gold,
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
    backgroundColor: Colors.dark.primary,
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
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: "#D4AF3720", borderColor: "#D4AF37" },
  filterText: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textSecondary },
  filterTextActive: { color: "#D4AF37" },
  headerStats: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 10, padding: 6, gap: 8, borderWidth: 1, borderColor: C.border },
  headerStat: { alignItems: "center", minWidth: 35 },
  headerStatNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  headerStatLabel: { fontSize: 8, fontFamily: "Inter_400Regular", color: C.textSecondary },
  headerStatDivider: { width: 1, height: 16, backgroundColor: C.border },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  invoiceDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  invoiceNumber: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 12, textAlign: "right" },
  amountsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  amountBlock: { flex: 1 },
  amountChip: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.gold },
  amountChipLight: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  amountLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
  cardMeta: { gap: 4, marginBottom: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  metaItem: { flexDirection: "row", gap: 6 },
  metaKey: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary, width: 70 },
  metaVal: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff", flex: 1 },
  cardActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.surface, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
});
