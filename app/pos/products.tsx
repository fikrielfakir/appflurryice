import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Platform, Alert, Modal, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp, Product } from "@/context/AppContext";
import POS from "@/constants/pos-colors";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ProductCard({ product, cartQty, onAdd, onPress }: {
  product: Product;
  cartQty: number;
  onAdd: () => void;
  onPress: () => void;
}) {
  const isLowStock = product.stock < 10;
  const isOutOfStock = product.stock === 0;

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productLeft}>
        <Text style={styles.productPrice}>{fmt(product.price)} MAD</Text>
        <View style={[styles.stockBadge, isLowStock && styles.stockBadgeLow]}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={11}
            color={isLowStock ? POS.danger : POS.primary}
          />
          <Text style={[styles.stockText, isLowStock && styles.stockTextLow]}>
            {fmt(product.stock)}
          </Text>
        </View>
        {isLowStock && (
          <View style={styles.lowStockTag}>
            <Feather name="alert-triangle" size={9} color={POS.danger} />
            <Text style={styles.lowStockText}>Low stock</Text>
          </View>
        )}
      </View>

      <View style={styles.productCenter}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productUnit}>{product.unit} · {product.category}</Text>
      </View>

      <View style={styles.productIconArea}>
        <View style={[styles.productIcon, { backgroundColor: POS.primaryBg }]}>
          <MaterialCommunityIcons name="ice-cream" size={28} color={POS.primary} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled, cartQty > 0 && styles.addBtnActive]}
        onPress={(e) => { e.stopPropagation(); onAdd(); }}
        disabled={isOutOfStock}
        activeOpacity={0.8}
      >
        {cartQty > 0 ? (
          <View style={styles.addBtnBadge}>
            <Text style={styles.addBtnBadgeText}>{cartQty}</Text>
            <Feather name="check" size={12} color="#fff" />
          </View>
        ) : (
          <Feather name="plus" size={20} color={isOutOfStock ? POS.textMuted : POS.primary} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, cart, addToCart } = useApp();
  const [search, setSearch] = useState("");
  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
  const [manualQty, setManualQty] = useState("1");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() =>
    products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const cartCount = cart.reduce((s, ci) => s + ci.qty, 0);
  const cartTotal = cart.reduce((s, ci) => s + ci.qty * ci.product.price, 0);

  function handleQuickAdd(product: Product) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCart(product, 1);
  }

  function handleProductPress(product: Product) {
    setQtyModalProduct(product);
    setManualQty("1");
  }

  function handleManualAdd() {
    if (!qtyModalProduct) return;
    const q = parseInt(manualQty);
    if (isNaN(q) || q <= 0) {
      Alert.alert("Invalid", "Please enter a valid quantity.");
      return;
    }
    if (q > qtyModalProduct.stock) {
      Alert.alert("Stock limit", `Only ${qtyModalProduct.stock} available.`);
      return;
    }
    addToCart(qtyModalProduct, q);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQtyModalProduct(null);
  }

  function getCartQty(productId: string) {
    return cart.find(ci => ci.product.id === productId)?.qty ?? 0;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Products</Text>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => router.push("/pos/cart")}
            disabled={cartCount === 0}
          >
            <Feather name="shopping-cart" size={22} color="#fff" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <Feather name="search" size={16} color={POS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={POS.textMuted}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={POS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            cartQty={getCartQty(item.id)}
            onAdd={() => handleQuickAdd(item)}
            onPress={() => handleProductPress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: POS.border, marginHorizontal: 16 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={36} color={POS.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {cartCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.cartBarLeft}>
            <Text style={styles.cartBarCount}>{cartCount} item{cartCount !== 1 ? "s" : ""}</Text>
            <Text style={styles.cartBarTotal}>{fmt(cartTotal)} MAD</Text>
          </View>
          <TouchableOpacity style={styles.cartBarBtn} onPress={() => router.push("/pos/cart")}>
            <Text style={styles.cartBarBtnText}>View Cart</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={!!qtyModalProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setQtyModalProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qtyModal}>
            <Text style={styles.qtyModalName}>{qtyModalProduct?.name}</Text>
            <Text style={styles.qtyModalPrice}>{fmt(qtyModalProduct?.price ?? 0)} MAD / {qtyModalProduct?.unit}</Text>
            <Text style={styles.qtyModalStock}>
              Stock: {fmt(qtyModalProduct?.stock ?? 0)} available
            </Text>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <TextInput
              style={styles.qtyInput}
              value={manualQty}
              onChangeText={setManualQty}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.qtyModalBtns}>
              <TouchableOpacity style={styles.qtyModalCancel} onPress={() => setQtyModalProduct(null)}>
                <Text style={styles.qtyModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qtyModalAdd} onPress={handleManualAdd}>
                <Text style={styles.qtyModalAddText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: POS.background },
  header: { backgroundColor: POS.primary, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff" },
  cartBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center", position: "relative" },
  cartBadge: {
    position: "absolute", top: -2, right: -2,
    backgroundColor: "#D4AF37", borderRadius: 10,
    minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 10,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, color: POS.text, fontFamily: "Inter_400Regular", fontSize: 14 },
  productCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: POS.card, paddingHorizontal: 16, paddingVertical: 14,
  },
  productLeft: { width: 90, gap: 4 },
  productPrice: { fontSize: 15, fontFamily: "Inter_700Bold", color: POS.text },
  stockBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: POS.primaryBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: "flex-start",
  },
  stockBadgeLow: { backgroundColor: POS.dangerBg },
  stockText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: POS.primary },
  stockTextLow: { color: POS.danger },
  lowStockTag: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  lowStockText: { fontSize: 9, fontFamily: "Inter_500Medium", color: POS.danger },
  productCenter: { flex: 1, paddingHorizontal: 10 },
  productName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: POS.text },
  productUnit: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary, marginTop: 2 },
  productIconArea: { marginRight: 8 },
  productIcon: { width: 52, height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  addBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: POS.primaryBg, justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: POS.primary,
  },
  addBtnActive: { backgroundColor: POS.primary },
  addBtnDisabled: { backgroundColor: POS.border, borderColor: POS.border },
  addBtnBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  addBtnBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: POS.primary, flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 14,
  },
  cartBarLeft: { gap: 2 },
  cartBarCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  cartBarTotal: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  cartBarBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  cartBarBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  qtyModal: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", gap: 8 },
  qtyModalName: { fontSize: 20, fontFamily: "Inter_700Bold", color: POS.text },
  qtyModalPrice: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.primary },
  qtyModalStock: { fontSize: 13, fontFamily: "Inter_400Regular", color: POS.textSecondary, marginBottom: 8 },
  qtyLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: POS.textSecondary },
  qtyInput: {
    borderWidth: 2, borderColor: POS.primary, borderRadius: 12,
    padding: 14, fontSize: 24, fontFamily: "Inter_700Bold",
    color: POS.text, textAlign: "center",
  },
  qtyModalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  qtyModalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: POS.background, alignItems: "center",
  },
  qtyModalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.textSecondary },
  qtyModalAdd: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: POS.primary, alignItems: "center",
  },
  qtyModalAddText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
