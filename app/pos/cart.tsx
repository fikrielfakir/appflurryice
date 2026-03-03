import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Platform, Modal, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import POS from "@/constants/pos-colors";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

import Toast from 'react-native-root-toast';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, updateCartQty, removeFromCart, clearCart } = useApp();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountPct, setDiscountPct] = useState("0");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const subtotal = cart.reduce((s, ci) => s + ci.qty * ci.product.price, 0);
  const discountAmt = subtotal * (parseFloat(discountPct || "0") / 100);
  const total = subtotal - discountAmt;

  function handleQtyEdit(productId: string, currentQty: number) {
    setEditingItem(productId);
    setEditQty(String(currentQty));
  }

  function confirmQtyEdit(productId: string) {
    const q = parseInt(editQty);
    if (!isNaN(q) && q > 0) {
      updateCartQty(productId, q);
    }
    setEditingItem(null);
  }

  if (cart.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: topInset }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Feather name="shopping-cart" size={48} color={POS.textMuted} />
          <Text style={{ fontSize: 16, color: POS.textSecondary, fontFamily: "Inter_500Medium", marginTop: 12 }}>Cart is empty</Text>
          <TouchableOpacity style={[styles.backToProducts, { marginTop: 20 }]} onPress={() => router.back()}>
            <Text style={styles.backToProductsText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert("Clear Cart", "Remove all items?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: () => { 
                  clearCart(); 
                  router.back(); 
                  Toast.show("Panier vidé", { duration: Toast.durations.SHORT });
                }},
              ]);
            }}
            style={styles.clearBtn}
          >
            <Feather name="trash-2" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={cart}
        keyExtractor={ci => ci.product.id}
        contentContainerStyle={{ paddingBottom: discountOpen ? 320 : 220, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: ci }) => (
          <View style={styles.cartCard}>
            <Text style={styles.cartItemName}>{ci.product.name}</Text>
            <View style={styles.cartRow}>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>Unit Price</Text>
                <Text style={styles.priceValue}>MAD {fmt(ci.product.price)}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => { Haptics.selectionAsync(); updateCartQty(ci.product.id, ci.qty + 1); }}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                {editingItem === ci.product.id ? (
                  <TextInput
                    style={styles.qtyInputInline}
                    value={editQty}
                    onChangeText={setEditQty}
                    keyboardType="number-pad"
                    autoFocus
                    onBlur={() => confirmQtyEdit(ci.product.id)}
                    onSubmitEditing={() => confirmQtyEdit(ci.product.id)}
                    selectTextOnFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => handleQtyEdit(ci.product.id, ci.qty)}>
                    <Text style={styles.qtyValue}>{ci.qty}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => { Haptics.selectionAsync(); updateCartQty(ci.product.id, ci.qty - 1); }}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.priceLabel}>Total</Text>
                <Text style={[styles.priceValue, { color: POS.success }]}>MAD {fmt(ci.qty * ci.product.price)}</Text>
              </View>
            </View>
            <View style={styles.cartFooter}>
              <TouchableOpacity
                style={styles.cartAction}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert("Remove", `Remove ${ci.product.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => {
                      removeFromCart(ci.product.id);
                      Toast.show("Article supprimé", { duration: Toast.durations.SHORT });
                    }},
                  ]);
                }}
              >
                <Feather name="trash-2" size={16} color={POS.danger} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cartAction}
                onPress={() => handleQtyEdit(ci.product.id, ci.qty)}
              >
                <Feather name="edit-2" size={16} color={POS.primary} />
              </TouchableOpacity>
              <View style={styles.stockInfo}>
                <MaterialCommunityIcons name="gift-outline" size={12} color={POS.primary} />
                <Text style={styles.stockInfoText}>{ci.product.stock.toLocaleString()} available</Text>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.subtotalRow}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDiscountOpen(v => !v); }}
          activeOpacity={0.9}
        >
          <View style={styles.subtotalInfo}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>MAD {fmt(subtotal)}</Text>
          </View>
          <Text style={styles.customizeBtn}>
            {discountOpen ? "Hide" : "Tap to customize"}
          </Text>
        </TouchableOpacity>

        {discountOpen && (
          <View style={styles.discountPanel}>
            <View style={styles.discountRow}>
              <Feather name="tag" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.discountLabel}>Discount</Text>
            </View>
            <View style={styles.discountInputRow}>
              <TextInput
                style={styles.discountInput}
                value={discountPct}
                onChangeText={setDiscountPct}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Text style={styles.discountPct}>%</Text>
            </View>
            {parseFloat(discountPct) > 0 && (
              <Text style={styles.discountSaving}>
                Saving: MAD {fmt(discountAmt)}
              </Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>MAD {fmt(total)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.customerBtn}
          onPress={() => router.push({ pathname: "/pos/customer", params: { discount: discountPct, subtotal: fmt(subtotal), total: fmt(total) } })}
        >
          <Feather name="user" size={18} color="#fff" />
          <Text style={styles.customerBtnText}>Select Customer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: POS.background },
  header: { backgroundColor: POS.primary, paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff", textAlign: "center" },
  clearBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  cartCard: { backgroundColor: POS.card, marginHorizontal: 12, borderRadius: 12, padding: 16, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cartItemName: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: POS.text, marginBottom: 12, textAlign: "right" },
  cartRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceBlock: { alignItems: "center", gap: 4 },
  priceLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  priceValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: POS.primary },
  qtyControls: { flexDirection: "row", alignItems: "center", gap: 0, backgroundColor: "#F5F5F5", borderRadius: 10, overflow: "hidden" },
  qtyBtn: { width: 40, height: 40, backgroundColor: POS.primary, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { fontSize: 22, fontFamily: "Inter_600SemiBold", color: "#fff", lineHeight: 26 },
  qtyValue: { width: 44, textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", color: POS.text },
  qtyInputInline: { width: 44, textAlign: "center", fontSize: 18, fontFamily: "Inter_700Bold", color: POS.text, padding: 0 },
  cartFooter: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 12 },
  cartAction: { width: 32, height: 32, backgroundColor: "#F5F5F5", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  stockInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  stockInfoText: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  backToProducts: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: POS.primary, borderRadius: 12 },
  backToProductsText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  bottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: POS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  subtotalRow: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subtotalInfo: { gap: 2 },
  subtotalLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  subtotalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  customizeBtn: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  discountPanel: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  discountRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  discountLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  discountInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  discountInput: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center",
  },
  discountPct: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  discountSaving: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  customerBtn: {
    marginHorizontal: 20, marginTop: 4, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)", flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  customerBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
