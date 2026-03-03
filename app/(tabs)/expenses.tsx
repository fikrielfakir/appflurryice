import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, Alert, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

const CATEGORIES = ["Office Rent", "Utilities", "Salaries", "Marketing", "Supplies", "Travel", "Equipment", "Other"];
const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Cheque", "Other"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CATEGORY_COLORS: Record<string, string> = {
  "Office Rent": "#6E62B6",
  "Utilities": C.warning,
  "Salaries": C.primary,
  "Marketing": C.secondary,
  "Supplies": C.success,
  "Travel": "#41C4D3",
  "Equipment": "#FF6B9D",
  "Other": C.textSecondary,
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat] || C.primary;
}

import Toast from 'react-native-root-toast';

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, deleteExpense, totalExpenses } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [note, setNote] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.forEach(e => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [expenses]);

  function openModal() {
    setCategory(CATEGORIES[0]); setAmount(""); setPaymentMethod(PAYMENT_METHODS[0]); setNote("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  }

  function handleAdd() {
    if (!amount.trim()) {
      Toast.show("Please enter an amount.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: C.danger,
      });
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      Toast.show("Enter a valid amount.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: C.danger,
      });
      return;
    }
    addExpense({ category, amount: amtNum, paymentMethod, note: note.trim() || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    Toast.show("Dépense ajoutée", { duration: Toast.durations.SHORT });
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#0A1628", "#0E1C3F", C.background]} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <Text style={styles.headerSub}>{expenses.length} records</Text>
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total Expenses</Text>
            <Text style={styles.totalValue}>${fmt(totalExpenses)}</Text>
          </View>
          <View style={styles.catSummary}>
            {byCat.map(([cat, amt]) => (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catDot, { backgroundColor: catColor(cat) }]} />
                <Text style={styles.catName} numberOfLines={1}>{cat}</Text>
                <Text style={styles.catAmt}>${fmt(amt)}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={expenses}
        keyExtractor={e => e.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + bottomInset }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const col = catColor(item.category);
          return (
            <View style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: col + "20" }]}>
                <Feather name="tag" size={18} color={col} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardCat}>{item.category}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardDate}>
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  {item.note ? <Text style={styles.cardNote} numberOfLines={1}>· {item.note}</Text> : null}
                </View>
                <View style={styles.methodBadge}>
                  <Feather name="credit-card" size={10} color={C.textMuted} />
                  <Text style={styles.methodText}>{item.paymentMethod}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardAmt}>${fmt(item.amount)}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Delete", "Remove this expense?", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteExpense(item.id) },
                    ]);
                  }}
                  style={styles.deleteBtn}
                >
                  <Feather name="trash-2" size={14} color={C.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="dollar-sign" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>No expenses yet</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity style={[styles.fab, { bottom: 90 + bottomInset }]} onPress={openModal}>
        <LinearGradient colors={["#2952C4", "#1A3C8F"]} style={styles.fabGradient}>
          <Feather name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Expense</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, category === cat && { backgroundColor: catColor(cat) + "30", borderColor: catColor(cat) }]}
                        onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                      >
                        <Text style={[styles.chipText, category === cat && { color: catColor(cat) }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Amount *</Text>
                <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount}
                  placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {PAYMENT_METHODS.map(pm => (
                      <TouchableOpacity
                        key={pm}
                        style={[styles.chip, paymentMethod === pm && { backgroundColor: C.primary + "30", borderColor: C.primary }]}
                        onPress={() => { Haptics.selectionAsync(); setPaymentMethod(pm); }}
                      >
                        <Text style={[styles.chipText, paymentMethod === pm && { color: C.primary }]}>{pm}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Note (optional)</Text>
                <TextInput style={[styles.fieldInput, { height: 70 }]} value={note} onChangeText={setNote}
                  placeholder="Add a note..." placeholderTextColor={C.textMuted} multiline />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <LinearGradient colors={["#2952C4", "#1A3C8F"]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Add Expense</Text>
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
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 4, marginBottom: 16 },
  totalCard: { backgroundColor: "rgba(255,138,72,0.08)", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,138,72,0.2)", gap: 12 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  totalValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.secondary, marginTop: 2 },
  catSummary: { gap: 6 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  catAmt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1, marginLeft: 12, gap: 3 },
  cardCat: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cardMeta: { flexDirection: "row", gap: 4 },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  cardNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textMuted, flex: 1 },
  methodBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  methodText: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textMuted },
  cardRight: { alignItems: "flex-end", gap: 8 },
  cardAmt: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  deleteBtn: { padding: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, overflow: "hidden", elevation: 8, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  modal: { flex: 1, backgroundColor: C.card },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  modalContent: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fieldInput: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
