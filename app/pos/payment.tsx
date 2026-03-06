import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, ScrollView, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useApp } from "@/context/AppContext";
import { Colors as POS } from "@/constants";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTranslation } from "react-i18next";

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Cheque", "Other"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

import Toast from 'react-native-root-toast';

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    discount: string; subtotal: string; total: string;
    customerName: string; customerPhone: string;
  }>();
  const { cart, updateCartQty, removeFromCart, addSale, clearCart, user } = useApp();

  const totalAmount = parseFloat(params.total?.replace(/,/g, "") || "0");
  const discountPct = parseFloat(params.discount || "0");

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState(fmt(totalAmount));
  const [returnAmount, setReturnAmount] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showRemoveItemConfirm, setShowRemoveItemConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{id: string, name: string} | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const paidNum = parseFloat(paidAmount.replace(/,/g, "") || "0");
  const returnNum = parseFloat(returnAmount || "0");
  const totalWithReturn = totalAmount - returnNum;
  const remaining = Math.max(0, totalWithReturn - paidNum);
  const change = Math.max(0, paidNum - totalWithReturn);

  const saleStatus = paidNum >= totalWithReturn ? "paid" : paidNum > 0 ? "partial" : "due";

  const now = new Date();
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
        backgroundColor: POS.warning,
      });
      return;
    }
    setProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const sale = addSale({
      customerName: params.customerName || "Walk-in Customer",
      customerPhone: params.customerPhone,
      amount: totalWithReturn,
      paid: Math.min(paidNum, totalWithReturn),
      discount: discountPct,
      shippingFee: returnNum,
      status: saleStatus,
      items: cart.map(ci => ({ name: ci.product.name, qty: ci.qty, price: ci.product.price })),
      paymentMethod,
      note: invoiceNote || undefined,
    });

    clearCart();
    setProcessing(false);

    router.replace({
      pathname: "/pos/invoice",
      params: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone || "",
        total: fmt(totalWithReturn),
        paid: fmt(sale.paid),
        remaining: fmt(remaining),
        change: fmt(change),
        returnAmount: fmt(returnNum),
        status: sale.status,
        paymentMethod,
        date: sale.date,
        discount: fmt(discountPct),
        itemsJson: JSON.stringify(sale.items),
        isPreview: "true",
        vendeur: user || "Vendeur",
      },
    });
  }

  const renderCartItem = ({ item: ci }: { item: typeof cart[0] }) => (
    <View style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{ci.product.name}</Text>
        <Text style={styles.productPrice}>MAD {fmt(ci.product.price)} × {ci.qty}</Text>
      </View>
      <View style={styles.productActions}>
        <View style={styles.qtyControlsMini}>
          <TouchableOpacity
            style={[styles.qtyBtnMini, ci.qty <= 1 && styles.qtyBtnMiniDisabled]}
            onPress={() => {
              Haptics.selectionAsync();
              if (ci.qty > 1) {
                updateCartQty(ci.product.id, ci.qty - 1);
              } else {
                handleRemoveItem(ci.product.id, ci.product.name);
              }
            }}
          >
            <Text style={styles.qtyBtnMiniText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValueMini}>{ci.qty}</Text>
          <TouchableOpacity
            style={[styles.qtyBtnMini, ci.qty >= ci.product.stock && styles.qtyBtnMiniDisabled]}
            onPress={() => {
              Haptics.selectionAsync();
              if (ci.qty < ci.product.stock) {
                updateCartQty(ci.product.id, ci.qty + 1);
              } else {
                Toast.show(`Stock maximum: ${ci.product.stock}`, { duration: Toast.durations.SHORT });
              }
            }}
          >
            <Text style={styles.qtyBtnMiniText}>+</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showRemoveItemConfirm}
        title={t('pos.removeItem') || "Remove Item"}
        message={itemToRemove ? `${t('pos.removeConfirmItem') || `Remove ${itemToRemove.name} from invoice?`}` : ""}
        confirmText={t('common.remove') || "Remove"}
        cancelText={t('common.cancel') || "Cancel"}
        type="danger"
        onConfirm={confirmRemoveItem}
        onCancel={() => {
          setShowRemoveItemConfirm(false);
          setItemToRemove(null);
        }}
      />
    </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('pos.payment')}</Text>
            <Text style={styles.headerSub}>{t('pos.completeTransaction')}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <View style={styles.card}>
          <View style={styles.cardRowBetween}>
            <View style={styles.cardRow}>
              <Feather name="shopping-cart" size={16} color={POS.textSecondary} />
              <Text style={styles.cardLabel}>{t('pos.productsInCart')} ({cart.length})</Text>
            </View>
            <TouchableOpacity 
              style={styles.addMoreBtn}
              onPress={() => router.back()}
            >
              <Feather name="plus" size={14} color={POS.primary} />
              <Text style={styles.addMoreBtnText}>{t('pos.addMore')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsList}>
            <FlatList
              data={cart}
              keyExtractor={ci => ci.product.id}
              renderItem={renderCartItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartText}>No products</Text>
                </View>
              }
            />
          </View>
          
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>{t('pos.subtotal')}</Text>
            <Text style={styles.subtotalValue}>MAD {fmt(totalAmount)}</Text>
          </View>
          {discountPct > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>{t('pos.discount')} ({discountPct}%)</Text>
              <Text style={[styles.subtotalValue, { color: POS.danger }]}>-MAD {fmt(totalAmount * discountPct / 100)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Feather name="clock" size={16} color={POS.textSecondary} />
            <Text style={styles.cardLabel}>{t('pos.dateTime')}</Text>
          </View>
          <View style={styles.dateBox}>
            <Feather name="calendar" size={14} color={POS.textSecondary} />
            <Text style={styles.dateText}>{dateStr} - {timeStr}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Feather name="credit-card" size={16} color={POS.textSecondary} />
            <Text style={styles.cardLabel}>{t('pos.paymentMethod')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                  onPress={() => { Haptics.selectionAsync(); setPaymentMethod(m); }}
                >
                  <Text style={[styles.methodChipText, paymentMethod === m && styles.methodChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>{t('pos.amountPaid')} (MAD)</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyTag}>MAD</Text>
              <TextInput
                style={styles.amountInput}
                value={paidAmount}
                onChangeText={setPaidAmount}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>
          </View>
          <TextInput
            style={styles.noteInput}
            value={invoiceNote}
            onChangeText={setInvoiceNote}
            placeholder={t('pos.paymentNotes')}
            placeholderTextColor={POS.textMuted}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="rotate-left" size={16} color={POS.textSecondary} />
            <Text style={styles.cardLabel}>{t('pos.additionalDetails')}</Text>
          </View>
          <View style={styles.extraField}>
            <View style={styles.extraLabelRow}>
              <MaterialCommunityIcons name="rotate-left" size={12} color={POS.warning} />
              <Text style={[styles.extraLabel, { color: POS.warning }]}>{t('pos.returnRefund')}</Text>
            </View>
            <TextInput
              style={[styles.extraInput, { borderColor: POS.warning + "50" }]}
              value={returnAmount}
              onChangeText={setReturnAmount}
              keyboardType="decimal-pad"
              placeholder={t('pos.returnPlaceholder')}
              placeholderTextColor={POS.textMuted}
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardRow}>
            <Feather name="file-text" size={16} color={POS.textSecondary} />
            <Text style={styles.summaryTitle}>{t('pos.paymentSummary')}</Text>
            {saleStatus === "paid" && (
              <View style={styles.verifiedTag}>
                <Feather name="check-circle" size={12} color={POS.success} />
                <Text style={styles.verifiedTagText}>{t('pos.verified')}</Text>
              </View>
            )}
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryBlockLabel}>{t('pos.total')}</Text>
            <Text style={styles.summaryBlockValue}>{fmt(totalWithReturn)}</Text>
            <Text style={styles.summaryCurrency}>MAD</Text>
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryBlockLabel}>{t('pos.paid')}</Text>
            <Text style={styles.summaryBlockValue}>{fmt(Math.min(paidNum, totalWithReturn))}</Text>
            <Text style={styles.summaryCurrency}>MAD</Text>
          </View>

          <View style={styles.summarySmallRow}>
            <View style={styles.summarySmallBlock}>
              <Text style={styles.summarySmallLabel}>{t('pos.remaining')}</Text>
              <Text style={[styles.summarySmallValue, { color: remaining > 0 ? POS.danger : POS.success }]}>
                {fmt(remaining)}
              </Text>
              <Text style={styles.summarySmallCurrency}>MAD</Text>
            </View>
            <View style={styles.summarySmallBlock}>
              <Text style={styles.summarySmallLabel}>{t('pos.change')}</Text>
              <Text style={[styles.summarySmallValue, { color: POS.success }]}>{fmt(change)}</Text>
              <Text style={styles.summarySmallCurrency}>MAD</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.completeBtn, processing && { opacity: 0.7 }]}
          onPress={handleComplete}
          disabled={processing}
        >
          <Feather name="printer" size={18} color="#fff" />
          <Text style={styles.completeBtnText}>{t('pos.completeSale')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleComplete}>
          <Feather name="share-2" size={18} color={POS.primary} />
          <Text style={styles.shareBtnText}>{t('pos.shareInvoice')}</Text>
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
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  card: { backgroundColor: POS.card, borderRadius: 14, padding: 14, gap: 10, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardRowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.text },
  addMoreBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: POS.primary + "15", borderRadius: 8 },
  addMoreBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: POS.primary },
  productsList: { backgroundColor: POS.background, borderRadius: 10, padding: 8, maxHeight: 200 },
  productRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: POS.border + "40" },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: POS.text },
  productPrice: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary, marginTop: 2 },
  productActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  productTotal: { fontSize: 13, fontFamily: "Inter_700Bold", color: POS.primary, minWidth: 60, textAlign: "right" },
  removeBtn: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  qtyControlsMini: { flexDirection: "row", alignItems: "center", backgroundColor: POS.card, borderRadius: 6, overflow: "hidden" },
  qtyBtnMini: { width: 24, height: 24, backgroundColor: POS.primary, justifyContent: "center", alignItems: "center" },
  qtyBtnMiniDisabled: { backgroundColor: POS.textMuted },
  qtyBtnMiniText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  qtyValueMini: { width: 24, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: POS.text },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: POS.border + "40", marginTop: 4 },
  subtotalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  subtotalValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: POS.text },
  emptyCart: { padding: 20, alignItems: "center" },
  emptyCartText: { fontSize: 13, color: POS.textMuted },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationVerified: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: POS.successBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  locationText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: POS.success },
  dateBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: POS.background, borderRadius: 8, padding: 12 },
  dateText: { fontSize: 14, fontFamily: "Inter_500Medium", color: POS.text },
  methodRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: POS.background, borderWidth: 1.5, borderColor: POS.border },
  methodChipActive: { backgroundColor: POS.primary + "15", borderColor: POS.primary },
  methodChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  methodChipTextActive: { color: POS.primary },
  amountBlock: { gap: 6 },
  amountLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  amountInputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: POS.border, borderRadius: 10, overflow: "hidden" },
  currencyTag: { backgroundColor: POS.primary, color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, paddingHorizontal: 12, paddingVertical: 14 },
  amountInput: { flex: 1, paddingHorizontal: 14, fontSize: 20, fontFamily: "Inter_700Bold", color: POS.text },
  noteInput: { backgroundColor: POS.background, borderRadius: 10, borderWidth: 1, borderColor: POS.border, padding: 10, color: POS.text, fontFamily: "Inter_400Regular", fontSize: 13 },
  extraRow: { flexDirection: "row", gap: 10 },
  extraField: { gap: 4 },
  extraLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  extraLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  extraInput: { backgroundColor: POS.background, borderRadius: 10, borderWidth: 1, borderColor: POS.border, padding: 10, color: POS.text, fontFamily: "Inter_400Regular", fontSize: 14 },
  summaryCard: { backgroundColor: POS.primary + "15", borderRadius: 16, padding: 16, gap: 12, borderWidth: 1.5, borderColor: POS.primary + "40" },
  summaryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.text },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: POS.successBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: "auto" },
  verifiedTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: POS.success },
  summaryBlock: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: POS.border + "80", alignItems: "flex-end" },
  summaryBlockLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  summaryBlockValue: { fontSize: 32, fontFamily: "Inter_700Bold", color: POS.primary, marginTop: 4 },
  summaryCurrency: { fontSize: 13, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  summarySmallRow: { flexDirection: "row", gap: 10 },
  summarySmallBlock: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "flex-end", borderWidth: 1, borderColor: POS.border + "80" },
  summarySmallLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: POS.textSecondary },
  summarySmallValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  summarySmallCurrency: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  bottomBar: { backgroundColor: POS.card, borderTopWidth: 1, borderTopColor: POS.border, paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 10 },
  completeBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: POS.primary, borderRadius: 12, paddingVertical: 14 },
  completeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: POS.primary + "15", borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: POS.primary },
  shareBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.primary },
});
