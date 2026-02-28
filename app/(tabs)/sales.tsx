import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, Alert, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Sale } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(s: string) {
  if (s === "paid") return C.success;
  if (s === "partial") return C.warning;
  return C.danger;
}

function SaleCard({ sale, onDelete }: { sale: Sale; onDelete: () => void }) {
  const due = sale.amount - sale.paid;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: C.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: C.primary }]}>
            {sale.customerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{sale.customerName}</Text>
          <Text style={styles.cardDate}>
            {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>${fmt(sale.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(sale.status) + "20" }]}>
            <Text style={[styles.badgeText, { color: statusColor(sale.status) }]}>
              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Paid</Text>
          <Text style={[styles.footerValue, { color: C.success }]}>${fmt(sale.paid)}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Due</Text>
          <Text style={[styles.footerValue, { color: due > 0 ? C.danger : C.textMuted }]}>${fmt(due)}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Items</Text>
          <Text style={styles.footerValue}>{sale.items.length}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Delete Sale", "Remove this sale record?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={14} color={C.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { sales, addSale, deleteSale, totalSales } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  function openModal() {
    setCustomerName(""); setAmount(""); setPaid(""); setNote("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  }

  function handleAdd() {
    if (!customerName.trim() || !amount.trim()) {
      Alert.alert("Required", "Please fill in customer name and amount.");
      return;
    }
    const amtNum = parseFloat(amount);
    const paidNum = parseFloat(paid || "0");
    if (isNaN(amtNum) || amtNum <= 0) {
      Alert.alert("Invalid", "Enter a valid amount.");
      return;
    }
    const paidFinal = Math.min(paidNum, amtNum);
    const status: Sale["status"] = paidFinal >= amtNum ? "paid" : paidFinal > 0 ? "partial" : "due";
    addSale({
      customerName: customerName.trim(),
      amount: amtNum,
      paid: isNaN(paidNum) ? 0 : paidFinal,
      status,
      items: [{ name: "Sale Item", qty: 1, price: amtNum }],
      note: note.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#1A2240", C.background]} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={styles.headerTitle}>Sales</Text>
        <Text style={styles.headerSub}>{sales.length} records · ${fmt(totalSales)} total</Text>
      </LinearGradient>

      <FlatList
        data={sales}
        keyExtractor={s => s.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + bottomInset }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SaleCard sale={item} onDelete={() => deleteSale(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="shopping-cart" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>No sales yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first sale</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity style={[styles.fab, { bottom: 90 + bottomInset }]} onPress={openModal}>
        <LinearGradient colors={["#5B7FFF", "#4C6FFF"]} style={styles.fabGradient}>
          <Feather name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Sale</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Customer Name *</Text>
                <TextInput style={styles.fieldInput} value={customerName} onChangeText={setCustomerName}
                  placeholder="Enter customer name" placeholderTextColor={C.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Total Amount *</Text>
                <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount}
                  placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount Paid</Text>
                <TextInput style={styles.fieldInput} value={paid} onChangeText={setPaid}
                  placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Note (optional)</Text>
                <TextInput style={[styles.fieldInput, { height: 80 }]} value={note} onChangeText={setNote}
                  placeholder="Add a note..." placeholderTextColor={C.textMuted} multiline />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <LinearGradient colors={["#5B7FFF", "#4C6FFF"]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Add Sale</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  cardAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerItem: { flex: 1, alignItems: "center" },
  footerLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, marginBottom: 2 },
  footerValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  deleteBtn: { padding: 6 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textMuted },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, overflow: "hidden", elevation: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  modal: { flex: 1, backgroundColor: C.card },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  modalContent: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fieldInput: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15,
  },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
