import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, ScrollView, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "@/context/AppContext";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

const PAYMENT_METHODS = [
  { key: "Cash",          icon: "dollar-sign" },
  { key: "Card",          icon: "credit-card" },
  { key: "Bank Transfer", icon: "repeat" },
  { key: "Cheque",        icon: "file-text" },
  { key: "Other",         icon: "more-horizontal" },
] as const;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    discount: string; subtotal: string; total: string;
    customerName: string; customerPhone: string;
  }>();
  const { cart, updateCartQty, removeFromCart, addSale, clearCart, user } = useApp();

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cart]);
  
  const discountPct = parseFloat(params.discount || "0");
  const discountAmount = totalAmount * discountPct / 100;
  const finalTotal = totalAmount - discountAmount;

  const [paymentMethod, setPaymentMethod]               = useState("Cash");
  const [paidAmount, setPaidAmount]                     = useState(fmt(finalTotal));
  const [returnAmount, setReturnAmount]                 = useState("");
  const [invoiceNote, setInvoiceNote]                   = useState("");
  const [processing, setProcessing]                     = useState(false);
  const [showRemoveItemConfirm, setShowRemoveItemConfirm] = useState(false);
  const [itemToRemove, setItemToRemove]                 = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setPaidAmount(fmt(finalTotal));
  }, [finalTotal]);

  const topInset      = Platform.OS === "web" ? 67 : insets.top;
  const paidNum       = parseFloat(paidAmount.replace(/,/g, "") || "0");
  const returnNum     = parseFloat(returnAmount || "0");
  const totalWithReturn = totalAmount - returnNum;
  const remaining     = Math.max(0, totalWithReturn - paidNum);
  const change        = Math.max(0, paidNum - totalWithReturn);
  const saleStatus    = paidNum >= totalWithReturn ? "paid" : paidNum > 0 ? "partial" : "due";

  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  function handleRemoveItem(productId: string, productName: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItemToRemove({ id: productId, name: productName });
    setShowRemoveItemConfirm(true);
  }

  function confirmRemoveItem() {
    if (itemToRemove) {
      removeFromCart(itemToRemove.id);
      Toast.show("Article supprimé", { duration: Toast.durations.SHORT });
    }
    setShowRemoveItemConfirm(false);
    setItemToRemove(null);
  }

  function handleComplete() {
    if (cart.length === 0) {
      Toast.show("Add products before completing a sale.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: D.amber,
      });
      return;
    }
    setProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const sale = addSale({
      customerName:  params.customerName || "Walk-in Customer",
      customerPhone: params.customerPhone,
      amount:        totalWithReturn,
      paid:          Math.min(paidNum, totalWithReturn),
      discount:      discountPct,
      shippingFee:   0,
      returnAmount: returnNum,
      status:        saleStatus,
      items:         cart.map((ci) => ({ name: ci.product.name, qty: ci.qty, price: ci.product.price })),
      paymentMethod,
      note:          invoiceNote || undefined,
      vendeur:       user || "Vendeur",
    });

    clearCart();
    setProcessing(false);

    router.replace({
      pathname: "/pos/invoice",
      params: {
        saleId:        sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName:  sale.customerName,
        customerPhone: sale.customerPhone || "",
        total:         fmt(totalWithReturn),
        paid:          fmt(sale.paid),
        remaining:     fmt(remaining),
        change:        fmt(change),
        returnAmount:  fmt(returnNum),
        status:        sale.status,
        paymentMethod,
        date:          sale.date,
        discount:      fmt(discountPct),
        itemsJson:     JSON.stringify(sale.items),
        isPreview:     "true",
        vendeur:       user || "Vendeur",
      },
    });
  }

  const renderCartItem = ({ item: ci, index }: { item: typeof cart[0]; index: number }) => (
    <View style={[S.productRow, index > 0 && S.productRowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={S.productName} numberOfLines={1}>{ci.product.name}</Text>
        <Text style={S.productMeta}>MAD {fmt(ci.product.price)} × {ci.qty}</Text>
      </View>
      <View style={S.productRight}>
        {/* Qty controls */}
        <View style={S.qtyMini}>
          <TouchableOpacity
            style={[S.qtyMiniBtn, S.qtyMiniBtnMinus, ci.qty <= 1 && S.qtyMiniDim]}
            onPress={() => {
              Haptics.selectionAsync();
              if (ci.qty > 1) updateCartQty(ci.product.id, ci.qty - 1);
              else handleRemoveItem(ci.product.id, ci.product.name);
            }}
          >
            <Feather name="minus" size={11} color="#fff" />
          </TouchableOpacity>
          <Text style={S.qtyMiniVal}>{ci.qty}</Text>
          <TouchableOpacity
            style={[S.qtyMiniBtn, S.qtyMiniBtnPlus, ci.qty >= ci.product.stock && S.qtyMiniDim]}
            onPress={() => {
              Haptics.selectionAsync();
              if (ci.qty < ci.product.stock) updateCartQty(ci.product.id, ci.qty + 1);
              else Toast.show(`Stock maximum: ${ci.product.stock}`, { duration: Toast.durations.SHORT });
            }}
          >
            <Feather name="plus" size={11} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Line total */}
        <Text style={S.productLineTotal}>{fmt(ci.product.price * ci.qty)}</Text>
      </View>
    </View>
  );

  // Status color helpers
  const statusColor = saleStatus === "paid" ? D.emerald : saleStatus === "partial" ? D.amber : D.rose;
  const statusBg    = saleStatus === "paid" ? D.emeraldBg : saleStatus === "partial" ? D.amberBg : D.roseBg;
  const statusLabel = saleStatus === "paid" ? t("pos.verified") : saleStatus === "partial" ? "Partiel" : "Impayé";

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <View style={[S.navRow, { paddingTop: topInset + 10 }]}>
          <TouchableOpacity style={S.hBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <View style={S.navCenter}>
            <Text style={S.navTitle}>{t("pos.payment")}</Text>
            <Text style={S.navSub}>{t("pos.completeTransaction")}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Customer chip */}
        {params.customerName ? (
          <View style={S.customerChip}>
            <View style={S.customerAvatar}>
              <Text style={S.customerAvatarTxt}>
                {params.customerName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={S.customerChipTxt} numberOfLines={1}>{params.customerName}</Text>
            {params.customerPhone ? (
              <Text style={S.customerChipPhone}> · {params.customerPhone}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ── Scroll body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 110 }}
      >

        {/* ── Products card ── */}
        <View style={S.card}>
          <View style={S.cardHeader}>
            <View style={S.cardTitleRow}>
              <View style={[S.cardTitleIcon, { backgroundColor: D.violetBg }]}>
                <Feather name="shopping-cart" size={13} color={D.heroAccent} />
              </View>
              <Text style={S.cardTitle}>{t("pos.productsInCart")} ({cart.length})</Text>
            </View>
            <TouchableOpacity style={S.addMoreBtn} onPress={() => router.back()}>
              <Feather name="plus" size={13} color={D.heroAccent} />
              <Text style={S.addMoreTxt}>{t("pos.addMore")}</Text>
            </TouchableOpacity>
          </View>

          <View style={S.productsList}>
            <FlatList
              data={cart}
              keyExtractor={(ci) => ci.product.id}
              renderItem={renderCartItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={S.emptyCart}>
                  <Feather name="inbox" size={18} color={D.inkGhost} />
                  <Text style={S.emptyCartTxt}>Aucun produit</Text>
                </View>
              }
            />
          </View>

          {/* Totals */}
          <View style={S.cardTotals}>
            <View style={S.totalLine}>
              <Text style={S.totalLineLbl}>{t("pos.subtotal")}</Text>
              <Text style={S.totalLineVal}>MAD {fmt(totalAmount)}</Text>
            </View>
            {discountPct > 0 && (
              <View style={S.totalLine}>
                <Text style={S.totalLineLbl}>{t("pos.discount")} ({discountPct}%)</Text>
                <Text style={[S.totalLineVal, { color: D.rose }]}>
                  −MAD {fmt(totalAmount * discountPct / 100)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Date/time card ── */}
        <View style={S.card}>
          <View style={S.cardTitleRow}>
            <View style={[S.cardTitleIcon, { backgroundColor: D.blueBg }]}>
              <Feather name="clock" size={13} color={D.blue} />
            </View>
            <Text style={S.cardTitle}>{t("pos.dateTime")}</Text>
          </View>
          <View style={S.dateBox}>
            <Feather name="calendar" size={13} color={D.inkSoft} />
            <Text style={S.dateTxt}>{dateStr} · {timeStr}</Text>
          </View>
        </View>

        {/* ── Payment method card ── */}
        <View style={S.card}>
          <View style={S.cardTitleRow}>
            <View style={[S.cardTitleIcon, { backgroundColor: D.emeraldBg }]}>
              <Feather name="credit-card" size={13} color={D.emerald} />
            </View>
            <Text style={S.cardTitle}>{t("pos.paymentMethod")}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={S.methodRow}>
              {PAYMENT_METHODS.map((m) => {
                const isActive = paymentMethod === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[S.methodChip, isActive && S.methodChipActive]}
                    onPress={() => { Haptics.selectionAsync(); setPaymentMethod(m.key); }}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={m.icon as any}
                      size={13}
                      color={isActive ? D.heroAccent : D.inkSoft}
                    />
                    <Text style={[S.methodChipTxt, isActive && S.methodChipTxtActive]}>
                      {m.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Amount paid */}
          <View style={S.amountBlock}>
            <Text style={S.amountLbl}>{t("pos.amountPaid")} (MAD)</Text>
            <View style={S.amountRow}>
              <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.currencyTag}>
                <Text style={S.currencyTxt}>MAD</Text>
              </LinearGradient>
              <TextInput
                style={S.amountInput}
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Note */}
          <View style={S.noteWrap}>
            <Feather name="edit-3" size={13} color={D.inkSoft} style={{ position: "absolute", top: 13, left: 12, zIndex: 1 }} />
            <TextInput
              style={S.noteInput}
              value={invoiceNote}
              onChangeText={setInvoiceNote}
              placeholder={t("pos.paymentNotes")}
              placeholderTextColor={D.inkGhost}
            />
          </View>
        </View>

        {/* ── Return/refund card ── */}
        <View style={S.card}>
          <View style={S.cardTitleRow}>
            <View style={[S.cardTitleIcon, { backgroundColor: D.amberBg }]}>
              <MaterialCommunityIcons name="rotate-left" size={13} color={D.amber} />
            </View>
            <Text style={S.cardTitle}>{t("pos.additionalDetails")}</Text>
          </View>
          <View style={S.extraField}>
            <View style={S.extraLabelRow}>
              <MaterialCommunityIcons name="rotate-left" size={11} color={D.amber} />
              <Text style={[S.extraLbl, { color: D.amber }]}>{t("pos.returnRefund")}</Text>
            </View>
            <TextInput
              style={[S.extraInput, { borderColor: D.amber + "50" }]}
              value={returnAmount}
              onChangeText={setReturnAmount}
              keyboardType="decimal-pad"
              placeholder={t("pos.returnPlaceholder")}
              placeholderTextColor={D.inkGhost}
            />
          </View>
        </View>

        {/* ── Summary card ── */}
        <View style={S.summaryCard}>
          <LinearGradient
            colors={[D.heroA + "18", D.heroAccent + "0D"]}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={S.summaryHeader}>
            <View style={S.cardTitleRow}>
              <View style={[S.cardTitleIcon, { backgroundColor: D.violetBg }]}>
                <Feather name="file-text" size={13} color={D.violet} />
              </View>
              <Text style={S.cardTitle}>{t("pos.paymentSummary")}</Text>
            </View>
            <View style={[S.statusPill, { backgroundColor: statusBg, borderColor: statusColor + "40" }]}>
              <View style={[S.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[S.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Big total + paid */}
          <View style={S.summaryMainRow}>
            <View style={S.summaryBigBlock}>
              <Text style={S.summaryBigLbl}>{t("pos.total")}</Text>
              <Text style={[S.summaryBigVal, { color: D.ink }]}>{fmt(totalWithReturn)}</Text>
              <Text style={S.summaryCurrencyLbl}>MAD</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryBigBlock}>
              <Text style={S.summaryBigLbl}>{t("pos.paid")}</Text>
              <Text style={[S.summaryBigVal, { color: D.emerald }]}>
                {fmt(Math.min(paidNum, totalWithReturn))}
              </Text>
              <Text style={S.summaryCurrencyLbl}>MAD</Text>
            </View>
          </View>

          {/* Remaining + Change */}
          <View style={S.summarySmallRow}>
            <View style={[S.summarySmallBlock, { borderColor: remaining > 0 ? D.rose + "40" : D.border }]}>
              <Text style={S.summarySmallLbl}>{t("pos.remaining")}</Text>
              <Text style={[S.summarySmallVal, { color: remaining > 0 ? D.rose : D.emerald }]}>
                {fmt(remaining)}
              </Text>
              <Text style={S.summarySmallCurrency}>MAD</Text>
            </View>
            <View style={[S.summarySmallBlock, { borderColor: change > 0 ? D.emerald + "40" : D.border }]}>
              <Text style={S.summarySmallLbl}>{t("pos.change")}</Text>
              <Text style={[S.summarySmallVal, { color: D.emerald }]}>{fmt(change)}</Text>
              <Text style={S.summarySmallCurrency}>MAD</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Bottom bar ── */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[S.completeBtn, processing && { opacity: 0.7 }]}
          onPress={handleComplete}
          disabled={processing}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[D.heroA, D.heroAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.completeBtnInner}>
            <Feather name="printer" size={17} color="#fff" />
            <Text style={S.completeBtnTxt}>{t("pos.completeSale")}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={S.shareBtn} onPress={handleComplete} activeOpacity={0.85}>
          <Feather name="share-2" size={17} color={D.heroAccent} />
          <Text style={S.shareBtnTxt}>{t("pos.shareInvoice")}</Text>
        </TouchableOpacity>
      </View>

      {/* Remove confirm */}
      <ConfirmModal
        visible={showRemoveItemConfirm}
        title={t("pos.removeItem") || "Supprimer l'article"}
        message={itemToRemove ? `Retirer ${itemToRemove.name} de la facture ?` : ""}
        confirmText={t("common.remove") || "Supprimer"}
        cancelText={t("common.cancel") || "Annuler"}
        type="danger"
        onConfirm={confirmRemoveItem}
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

  navRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  navCenter:{ flex: 1, alignItems: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: -0.3 },
  navSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 1 },
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  // Customer chip
  customerChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  customerAvatar: { width: 28, height: 28, borderRadius: 8, backgroundColor: D.heroAccent, justifyContent: "center", alignItems: "center" },
  customerAvatarTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  customerChipTxt:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1 },
  customerChipPhone: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },

  // Cards
  card: {
    backgroundColor: D.card,
    borderRadius: 18, borderWidth: 1, borderColor: D.border,
    padding: 14, gap: 12,
    elevation: 1, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4,
  },
  cardHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitleIcon:{ width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  cardTitle:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.inkMid },

  addMoreBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: D.violetBg, borderRadius: 8,
    borderWidth: 1, borderColor: D.heroAccent + "30",
  },
  addMoreTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.heroAccent },

  // Products list
  productsList: { backgroundColor: D.bg, borderRadius: 12, padding: 8 },
  productRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  productRowBorder: { borderTopWidth: 1, borderTopColor: D.border },
  productName:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.ink },
  productMeta:  { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },
  productRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  productLineTotal: { fontSize: 12, fontFamily: "Inter_700Bold", color: D.heroAccent, minWidth: 52, textAlign: "right" },

  qtyMini:        { flexDirection: "row", alignItems: "center", borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: D.border },
  qtyMiniBtn:     { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  qtyMiniBtnMinus:{ backgroundColor: D.rose },
  qtyMiniBtnPlus: { backgroundColor: D.emerald },
  qtyMiniDim:     { opacity: 0.4 },
  qtyMiniVal:     { width: 24, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.ink, backgroundColor: D.bg },

  emptyCart:   { padding: 20, alignItems: "center", gap: 6 },
  emptyCartTxt:{ fontSize: 13, color: D.inkGhost, fontFamily: "Inter_400Regular" },

  cardTotals:  { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: D.border },
  totalLine:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLineLbl:{ fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkSoft },
  totalLineVal:{ fontSize: 13, fontFamily: "Inter_700Bold", color: D.ink },

  // Date
  dateBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: D.bg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: D.border,
  },
  dateTxt: { fontSize: 14, fontFamily: "Inter_500Medium", color: D.inkMid },

  // Payment methods
  methodRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, backgroundColor: D.bg,
    borderWidth: 1.5, borderColor: D.border,
  },
  methodChipActive:   { backgroundColor: D.violetBg, borderColor: D.heroAccent + "60" },
  methodChipTxt:      { fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkSoft },
  methodChipTxtActive:{ color: D.heroAccent, fontFamily: "Inter_600SemiBold" },

  // Amount
  amountBlock: { gap: 8 },
  amountLbl:   { fontSize: 11, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 },
  amountRow:   { flexDirection: "row", alignItems: "center", borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: D.border },
  currencyTag: { paddingHorizontal: 14, paddingVertical: 15, justifyContent: "center", alignItems: "center" },
  currencyTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  amountInput: { flex: 1, paddingHorizontal: 14, fontSize: 22, fontFamily: "Inter_700Bold", color: D.ink, backgroundColor: D.bg },

  // Note
  noteWrap: { position: "relative" },
  noteInput: {
    backgroundColor: D.bg, borderRadius: 12,
    borderWidth: 1, borderColor: D.border,
    paddingVertical: 12, paddingLeft: 36, paddingRight: 12,
    color: D.ink, fontFamily: "Inter_400Regular", fontSize: 13,
  },

  // Return
  extraField:   { gap: 6 },
  extraLabelRow:{ flexDirection: "row", alignItems: "center", gap: 4 },
  extraLbl:     { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  extraInput:   {
    backgroundColor: D.bg, borderRadius: 12,
    borderWidth: 1, padding: 12,
    color: D.ink, fontFamily: "Inter_400Regular", fontSize: 15,
  },

  // Summary card
  summaryCard: {
    borderRadius: 20, borderWidth: 1.5, borderColor: D.heroAccent + "25",
    padding: 16, gap: 14, overflow: "hidden",
  },
  summaryHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill:     { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusTxt:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  summaryMainRow: { flexDirection: "row", gap: 0 },
  summaryBigBlock:{ flex: 1, backgroundColor: D.surface, borderRadius: 14, padding: 14, alignItems: "flex-end", borderWidth: 1, borderColor: D.border },
  summaryDivider: { width: 10 },
  summaryBigLbl:  { fontSize: 11, fontFamily: "Inter_500Medium", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryBigVal:  { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 },
  summaryCurrencyLbl: { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft },

  summarySmallRow:   { flexDirection: "row", gap: 10 },
  summarySmallBlock: { flex: 1, backgroundColor: D.surface, borderRadius: 14, padding: 14, alignItems: "flex-end", borderWidth: 1 },
  summarySmallLbl:   { fontSize: 10, fontFamily: "Inter_500Medium", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 },
  summarySmallVal:   { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 4 },
  summarySmallCurrency: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },

  // Bottom bar
  bottomBar: {
    backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border,
    paddingHorizontal: 14, paddingTop: 12, flexDirection: "row", gap: 10,
    elevation: 4, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 1, shadowRadius: 6,
  },
  completeBtn:      { flex: 2, borderRadius: 14, overflow: "hidden" },
  completeBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52 },
  completeBtnTxt:   { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: D.violetBg, borderRadius: 14, height: 52,
    borderWidth: 1.5, borderColor: D.heroAccent + "40",
  },
  shareBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.heroAccent },
});