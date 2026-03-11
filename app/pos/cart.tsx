import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:         "#F7F6F2",
  surface:    "#FFFFFF",
  card:       "#FFFFFF",

  heroA:      "#1C1C2E",
  heroB:      "#2D2B55",
  heroAccent: "#6C63FF",
  heroGlow:   "#A78BFA",

  ink:        "#111118",
  inkMid:     "#3D3C52",
  inkSoft:    "#8B8AA5",
  inkGhost:   "#C4C3D0",

  emerald:    "#00B37D",
  emeraldBg:  "#E6FAF4",
  rose:       "#F04E6A",
  roseBg:     "#FEE9ED",
  amber:      "#F59E0B",
  amberBg:    "#FEF3C7",
  blue:       "#3B82F6",
  blueBg:     "#EFF6FF",
  violet:     "#8B5CF6",
  violetBg:   "#F5F3FF",

  border:     "#ECEAE4",
  shadow:     "rgba(17,17,24,0.06)",
};

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, updateCartQty, removeFromCart, clearCart } = useApp();
  const { t } = useTranslation();

  const [discountOpen, setDiscountOpen]               = useState(false);
  const [discountPct, setDiscountPct]                 = useState("0");
  const [editingItem, setEditingItem]                 = useState<string | null>(null);
  const [editQty, setEditQty]                         = useState("");
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showRemoveItemConfirm, setShowRemoveItemConfirm] = useState(false);
  const [itemToRemove, setItemToRemove]               = useState<string | null>(null);

  const topInset  = Platform.OS === "web" ? 67 : insets.top;
  const subtotal  = cart.reduce((s, ci) => s + ci.qty * ci.product.price, 0);
  const discountAmt = subtotal * (parseFloat(discountPct || "0") / 100);
  const total     = subtotal - discountAmt;

  function handleQtyEdit(productId: string, currentQty: number) {
    setEditingItem(productId);
    setEditQty(String(currentQty));
  }

  function confirmQtyEdit(productId: string) {
    const q = parseInt(editQty);
    const cartItem = cart.find((ci) => ci.product.id === productId);
    if (!cartItem) return;
    const maxQty = cartItem.product.stock;
    if (isNaN(q) || q <= 0) {
      Toast.show(t("pos.invalidQty"), { duration: Toast.durations.SHORT });
      setEditingItem(null);
      return;
    }
    if (q > maxQty) {
      Toast.show(`${t("pos.maxStock")}: ${maxQty}`, { duration: Toast.durations.SHORT });
      setEditingItem(null);
      return;
    }
    updateCartQty(productId, q);
    setEditingItem(null);
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (cart.length === 0) {
    return (
      <View style={[S.screen, { backgroundColor: D.bg }]}>
        {/* Hero header */}
        <View style={S.hero}>
          <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
          <View style={S.blob1} pointerEvents="none" />
          <View style={[S.headerRow, { paddingTop: topInset + 10 }]}>
            <TouchableOpacity style={S.hBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <Text style={S.headerTitle}>{t("pos.cart")}</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>

        <View style={S.emptyWrap}>
          <View style={S.emptyIcon}>
            <Feather name="shopping-cart" size={30} color={D.inkSoft} />
          </View>
          <Text style={S.emptyTitle}>{t("pos.noItems")}</Text>
          <Text style={S.emptyDesc}>Ajoutez des produits depuis la liste</Text>
          <TouchableOpacity style={S.emptyBtn} onPress={() => router.back()}>
            <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.emptyBtnInner}>
              <Feather name="arrow-left" size={15} color="#fff" />
              <Text style={S.emptyBtnTxt}>{t("pos.browseProducts")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Full cart ───────────────────────────────────────────────────────────────
  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* Hero header */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />
        <View style={[S.headerRow, { paddingTop: topInset + 10 }]}>
          <TouchableOpacity style={S.hBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={S.headerCenter}>
            <Text style={S.headerTitle}>{t("pos.cart")}</Text>
            <View style={S.itemsBadge}>
              <Text style={S.itemsBadgeTxt}>{cart.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[S.hBtn, { backgroundColor: "rgba(240,78,106,0.22)", borderColor: "rgba(240,78,106,0.3)" }]}
            onPress={() => setShowClearCartConfirm(true)}
          >
            <Feather name="trash-2" size={17} color="#FF8FA3" />
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={S.heroSummary}>
          <View style={S.heroStat}>
            <Text style={S.heroStatVal}>{cart.length}</Text>
            <Text style={S.heroStatLbl}>Articles</Text>
          </View>
          <View style={S.heroStatDiv} />
          <View style={S.heroStat}>
            <Text style={S.heroStatVal}>{fmt(subtotal)}</Text>
            <Text style={S.heroStatLbl}>Sous-total MAD</Text>
          </View>
          {parseFloat(discountPct) > 0 && (
            <>
              <View style={S.heroStatDiv} />
              <View style={S.heroStat}>
                <Text style={[S.heroStatVal, { color: D.amber }]}>−{fmt(discountAmt)}</Text>
                <Text style={S.heroStatLbl}>Remise MAD</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Cart items */}
      <FlatList
        data={cart}
        keyExtractor={(ci) => ci.product.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: discountOpen ? 340 : 240 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item: ci }) => {
          const remaining = ci.product.stock - ci.qty;
          const isLow = remaining < 5;
          return (
            <View style={S.card}>
              {/* Left accent */}
              <View style={[S.cardStrip, { backgroundColor: D.heroAccent }]} />

              <View style={S.cardInner}>
                {/* Product name */}
                <Text style={S.cardName} numberOfLines={2}>{ci.product.name}</Text>

                {/* Price row */}
                <View style={S.priceRow}>
                  <View style={S.priceBlock}>
                    <Text style={S.priceLbl}>{t("pos.unitPrice")}</Text>
                    <Text style={S.priceVal}>MAD {fmt(ci.product.price)}</Text>
                  </View>

                  {/* Qty controls */}
                  <View style={S.qtyControls}>
                    <TouchableOpacity
                      style={[S.qtyBtn, S.qtyBtnMinus, ci.qty <= 1 && S.qtyBtnDim]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (ci.qty > 1) updateCartQty(ci.product.id, ci.qty - 1);
                        else removeFromCart(ci.product.id);
                      }}
                    >
                      <Feather name="minus" size={14} color="#fff" />
                    </TouchableOpacity>

                    {editingItem === ci.product.id ? (
                      <TextInput
                        style={S.qtyInput}
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
                        <Text style={S.qtyVal}>{ci.qty}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[S.qtyBtn, S.qtyBtnPlus, ci.qty >= ci.product.stock && S.qtyBtnDim]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        if (ci.qty < ci.product.stock) updateCartQty(ci.product.id, ci.qty + 1);
                        else Toast.show(`${t("pos.maxStock")}: ${ci.product.stock}`, { duration: Toast.durations.SHORT });
                      }}
                    >
                      <Feather name="plus" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={S.priceBlock}>
                    <Text style={S.priceLbl}>{t("pos.totalPrice")}</Text>
                    <Text style={[S.priceVal, { color: D.emerald }]}>{fmt(ci.qty * ci.product.price)}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={S.cardFooter}>
                  <TouchableOpacity
                    style={[S.footerAction, { backgroundColor: D.roseBg }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setItemToRemove(ci.product.id); setShowRemoveItemConfirm(true); }}
                  >
                    <Feather name="trash-2" size={13} color={D.rose} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.footerAction, { backgroundColor: D.blueBg }]}
                    onPress={() => handleQtyEdit(ci.product.id, ci.qty)}
                  >
                    <Feather name="edit-2" size={13} color={D.blue} />
                  </TouchableOpacity>
                  <View style={[S.stockPill, { backgroundColor: isLow ? D.amberBg : D.emeraldBg }]}>
                    <View style={[S.stockDot, { backgroundColor: isLow ? D.amber : D.emerald }]} />
                    <Text style={[S.stockTxt, { color: isLow ? D.amber : D.emerald }]}>
                      {remaining.toLocaleString()} {t("pos.available")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom panel */}
      <View style={[S.bottomPanel, { paddingBottom: insets.bottom + 10 }]}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob3} pointerEvents="none" />

        {/* Subtotal / toggle */}
        <TouchableOpacity
          style={S.subtotalRow}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDiscountOpen((v) => !v); }}
          activeOpacity={0.9}
        >
          <View>
            <Text style={S.subtotalLbl}>{t("pos.subtotal")}</Text>
            <Text style={S.subtotalVal}>{fmt(subtotal)} MAD</Text>
          </View>
          <View style={S.discountToggle}>
            <Feather name="tag" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={S.discountToggleTxt}>
              {discountOpen ? t("pos.hideDiscount") : t("pos.customizeDiscount")}
            </Text>
            <Feather name={discountOpen ? "chevron-down" : "chevron-up"} size={13} color="rgba(255,255,255,0.5)" />
          </View>
        </TouchableOpacity>

        {/* Discount panel */}
        {discountOpen && (
          <View style={S.discountPanel}>
            <View style={S.discountInputRow}>
              <View style={S.discountIcon}>
                <Feather name="percent" size={15} color="rgba(255,255,255,0.7)" />
              </View>
              <TextInput
                style={S.discountInput}
                value={discountPct}
                onChangeText={setDiscountPct}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Text style={S.discountPctTxt}>%</Text>
            </View>
            {parseFloat(discountPct) > 0 && (
              <View style={S.savingRow}>
                <Feather name="trending-down" size={12} color={D.amber} />
                <Text style={S.savingTxt}>{t("pos.saving")}: {fmt(discountAmt)} MAD</Text>
              </View>
            )}
            <View style={S.totalRow}>
              <Text style={S.totalLbl}>{t("pos.total")}</Text>
              <Text style={S.totalVal}>MAD {fmt(total)}</Text>
            </View>
          </View>
        )}

        {/* Customer / checkout */}
        <TouchableOpacity
          style={S.checkoutBtn}
          onPress={() => router.push({
            pathname: "/pos/customer",
            params: { discount: discountPct, subtotal: fmt(subtotal), total: fmt(total) },
          })}
          activeOpacity={0.85}
        >
          <Text style={S.checkoutBtnTxt}>{t("pos.selectCustomer")}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <ConfirmModal
        visible={showClearCartConfirm}
        title={t("common.clear") || "Vider le panier"}
        message={t("pos.removeConfirm") || "Supprimer tous les articles ?"}
        confirmText={t("common.clear") || "Vider"}
        cancelText={t("common.cancel") || "Annuler"}
        type="danger"
        onConfirm={() => {
          clearCart();
          router.back();
          Toast.show(t("pos.cartCleared"), { duration: Toast.durations.SHORT });
          setShowClearCartConfirm(false);
        }}
        onCancel={() => setShowClearCartConfirm(false)}
      />

      <ConfirmModal
        visible={showRemoveItemConfirm}
        title={t("pos.removeItem") || "Supprimer l'article"}
        message={t("pos.removeConfirm") || "Retirer cet article du panier ?"}
        confirmText={t("common.remove") || "Supprimer"}
        cancelText={t("common.cancel") || "Annuler"}
        type="danger"
        onConfirm={() => {
          if (itemToRemove) {
            removeFromCart(itemToRemove);
            Toast.show(t("pos.itemRemoved"), { duration: Toast.durations.SHORT });
          }
          setShowRemoveItemConfirm(false);
          setItemToRemove(null);
        }}
        onCancel={() => { setShowRemoveItemConfirm(false); setItemToRemove(null); }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroAccent, opacity: 0.1, top: -50, right: -50 },
  blob2: { position: "absolute", width: 100, height: 100, borderRadius: 50,  backgroundColor: D.heroGlow,   opacity: 0.07, bottom: 0, left: -20 },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: -0.3 },
  itemsBadge: { backgroundColor: D.heroAccent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  itemsBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },

  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  // Hero summary strip
  heroSummary: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, gap: 0,
  },
  heroStat:    { flex: 1, alignItems: "center", gap: 2 },
  heroStatDiv: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },
  heroStatVal: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLbl: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Inter_400Regular" },

  // Cart card
  card: {
    flexDirection: "row",
    backgroundColor: D.card,
    borderRadius: 18, borderWidth: 1, borderColor: D.border,
    overflow: "hidden",
    elevation: 2, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 12 },
  cardName:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink, lineHeight: 20 },

  priceRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceBlock: { alignItems: "center", gap: 3, flex: 1 },
  priceLbl:   { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  priceVal:   { fontSize: 13, fontFamily: "Inter_700Bold", color: D.heroAccent },

  // Qty controls
  qtyControls: { flexDirection: "row", alignItems: "center", backgroundColor: D.bg, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: D.border },
  qtyBtn:      { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  qtyBtnMinus: { backgroundColor: D.rose },
  qtyBtnPlus:  { backgroundColor: D.emerald },
  qtyBtnDim:   { opacity: 0.4 },
  qtyVal:      { width: 40, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold", color: D.ink },
  qtyInput:    { width: 40, textAlign: "center", fontSize: 16, fontFamily: "Inter_700Bold", color: D.ink, padding: 0 },

  cardFooter:  { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: D.border },
  footerAction:{ width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  stockPill:   { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginLeft: "auto" as any },
  stockDot:    { width: 5, height: 5, borderRadius: 3 },
  stockTxt:    { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // Empty
  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: D.surface, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  emptyDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft },
  emptyBtn:   { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  emptyBtnInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 22 },
  emptyBtnTxt:   { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Bottom panel
  bottomPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden",
    paddingHorizontal: 20, paddingTop: 6,
  },
  blob3: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: D.heroAccent, opacity: 0.08, top: -40, right: -40 },

  subtotalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  subtotalLbl:    { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginBottom: 2 },
  subtotalVal:    { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  discountToggle: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  discountToggleTxt: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },

  discountPanel:   { paddingBottom: 10, gap: 10 },
  discountInputRow:{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" },
  discountIcon:    { width: 44, height: 48, justifyContent: "center", alignItems: "center" },
  discountInput:   { flex: 1, color: "#fff", fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center", height: 48 },
  discountPctTxt:  { width: 40, textAlign: "center", fontSize: 18, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)" },
  savingRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  savingTxt:       { fontSize: 12, fontFamily: "Inter_400Regular", color: D.amber },
  totalRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  totalLbl:        { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)" },
  totalVal:        { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },

  checkoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14, paddingVertical: 14,
    marginTop: 4,
  },
  checkoutBtnTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.heroAccent, flex: 1, textAlign: "center" },
});