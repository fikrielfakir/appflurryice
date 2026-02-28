import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, Alert, Share, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp, Sale } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

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
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Call", `Calling ${sale.customerPhone}`)}>
            <Feather name="phone" size={16} color={C.success} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
          <Feather name="share-2" size={16} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Print", "Sending to printer...")}>
          <Feather name="printer" size={16} color={C.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={C.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Edit", "Edit functionality coming soon.")}>
          <Feather name="edit-2" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { sales, deleteSale, totalSales } = useApp();
  const [filter, setFilter] = useState<"all" | "paid" | "partial" | "due">("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = filter === "all" ? sales : sales.filter(s => s.status === filter);

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
      <LinearGradient colors={["#0A1628", "#0E1C3F", C.background]} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Sales</Text>
            <Text style={styles.headerSub}>{sales.length} invoices · MAD {fmt(totalSales)}</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatNum, { color: "#4CAF50" }]}>{paidCount}</Text>
              <Text style={styles.headerStatLabel}>Paid</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatNum, { color: C.warning }]}>{dueCount}</Text>
              <Text style={styles.headerStatLabel}>Unpaid</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(["all", "paid", "partial", "due"] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

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
                { text: "Delete", style: "destructive", onPress: () => deleteSale(item.id) },
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
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 4 },
  headerStats: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: C.border },
  headerStat: { alignItems: "center" },
  headerStatNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textSecondary },
  headerStatDivider: { width: 1, height: 24, backgroundColor: C.border },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: "#D4AF3720", borderColor: "#D4AF37" },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  filterTextActive: { color: "#D4AF37" },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  invoiceDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  invoiceNumber: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 12, textAlign: "right" },
  amountsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  amountBlock: { flex: 1 },
  amountChip: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.warning },
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
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, overflow: "hidden", elevation: 8, shadowColor: "#1A3C8F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 },
  fabGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
});
