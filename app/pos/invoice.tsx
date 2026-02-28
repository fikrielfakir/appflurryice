import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Alert, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import POS from "@/constants/pos-colors";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    invoiceNumber: string; customerName: string; customerPhone: string;
    total: string; paid: string; remaining: string; change: string;
    status: string; paymentMethod: string; date: string;
    discount: string; itemsJson: string;
  }>();

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const items: { name: string; qty: number; price: number }[] = params.itemsJson
    ? JSON.parse(params.itemsJson)
    : [];

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discountPct = parseFloat(params.discount || "0");
  const total = parseFloat(params.total?.replace(/,/g, "") || "0");
  const paid = parseFloat(params.paid?.replace(/,/g, "") || "0");
  const dateObj = params.date ? new Date(params.date) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  async function handleShare() {
    try {
      const text = [
        `INVOICE #${params.invoiceNumber}`,
        `Date: ${dateStr}`,
        `Customer: ${params.customerName} ${params.customerPhone ? `(${params.customerPhone})` : ""}`,
        ``,
        ...items.map(i => `${i.name}  x${i.qty}  ${fmt(i.price)}  =  MAD ${fmt(i.qty * i.price)}`),
        ``,
        `Subtotal: MAD ${fmt(subtotal)}`,
        discountPct > 0 ? `Discount: ${discountPct}%` : null,
        `TOTAL: MAD ${fmt(total)}`,
        `Paid: MAD ${fmt(paid)}`,
      ].filter(Boolean).join("\n");

      await Share.share({ message: text, title: `Invoice #${params.invoiceNumber}` });
    } catch (e) {
      Alert.alert("Error", "Could not share invoice.");
    }
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/(tabs)/sales");
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={styles.headerRow}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Invoice</Text>
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={styles.invoice}>
          <View style={styles.invoiceHeader}>
            <View style={styles.logoCircle}>
              <Feather name="bar-chart" size={28} color={POS.primary} />
            </View>
            <Text style={styles.businessName}>BizPOS</Text>
            <Text style={styles.businessAddress}>Business Management Suite</Text>
          </View>

          <View style={styles.invoiceTitleRow}>
            <Text style={styles.invoiceTitle}>FACTURE #{params.invoiceNumber}</Text>
          </View>

          <View style={styles.invoiceMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Amount Due:</Text>
              <Text style={styles.metaValue}>MAD {fmt(total)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.billTo}>
            <Text style={styles.billToLabel}>Facturer à:</Text>
            <Text style={styles.billToName}>{params.customerName}</Text>
            {params.customerPhone ? (
              <Text style={styles.billToPhone}>{params.customerPhone}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Article</Text>
            <Text style={styles.th}>Qté</Text>
            <Text style={styles.th}>PU</Text>
            <Text style={styles.th}>Total</Text>
          </View>
          <View style={styles.tableDivider} />

          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 2, fontFamily: "Inter_500Medium" }]}>{item.name}</Text>
              <Text style={styles.td}>{item.qty}</Text>
              <Text style={styles.td}>{fmt(item.price)}</Text>
              <Text style={styles.td}>{fmt(item.qty * item.price)}</Text>
            </View>
          ))}

          <View style={styles.tableDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total:</Text>
            <Text style={styles.summaryValue}>MAD {fmt(subtotal)}</Text>
          </View>

          {discountPct > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount ({discountPct}%):</Text>
              <Text style={[styles.summaryValue, { color: POS.success }]}>- MAD {fmt(subtotal * discountPct / 100)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>MAD {fmt(total)}</Text>
          </View>

          <View style={styles.paidRow}>
            <Text style={styles.paidLabel}>Montant payé:</Text>
            <Text style={styles.paidValue}>MAD {fmt(paid)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.barcodeArea}>
            {[...Array(40)].map((_, i) => (
              <View
                key={i}
                style={[styles.barLine, {
                  width: i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1,
                  height: i % 4 === 0 ? 40 : 30,
                  backgroundColor: "#000",
                }]}
              />
            ))}
          </View>
          <Text style={styles.barcodeText}>{params.invoiceNumber}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.printBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Print", "Invoice sent to printer.");
          }}
        >
          <Feather name="printer" size={18} color="#fff" />
          <Text style={styles.printBtnText}>Print</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Feather name="share-2" size={18} color={POS.primary} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F0F0F0" },
  header: { backgroundColor: POS.primary, paddingBottom: 14, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff" },
  doneBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8 },
  doneBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  invoice: { backgroundColor: "#fff", borderRadius: 4, padding: 24, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  invoiceHeader: { alignItems: "center", marginBottom: 16, gap: 4 },
  logoCircle: { width: 64, height: 64, borderRadius: 16, backgroundColor: POS.primaryBg, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  businessName: { fontSize: 20, fontFamily: "Inter_700Bold", color: POS.text },
  businessAddress: { fontSize: 11, fontFamily: "Inter_400Regular", color: POS.textSecondary, textAlign: "center" },
  invoiceTitleRow: { alignItems: "center", marginVertical: 12 },
  invoiceTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: POS.text, letterSpacing: 0.5 },
  invoiceMeta: { gap: 6, marginBottom: 12 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  metaValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: POS.text },
  divider: { height: 1, backgroundColor: POS.border, marginVertical: 10 },
  billTo: { gap: 2, marginBottom: 4 },
  billToLabel: { fontSize: 12, fontFamily: "Inter_700Bold", color: POS.text },
  billToName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.text },
  billToPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  tableHeader: { flexDirection: "row", marginBottom: 4 },
  th: { flex: 1, fontSize: 11, fontFamily: "Inter_700Bold", color: POS.textSecondary, textAlign: "right" },
  tableDivider: { height: 1, backgroundColor: POS.border, marginVertical: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 6 },
  td: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: POS.text, textAlign: "right" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  summaryValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: POS.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: POS.text },
  totalValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: POS.primary },
  paidRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  paidLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  paidValue: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: POS.success },
  barcodeArea: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 1, marginTop: 16 },
  barLine: { borderRadius: 1 },
  barcodeText: { textAlign: "center", fontSize: 10, fontFamily: "Inter_400Regular", color: POS.textSecondary, marginTop: 4 },
  bottomBar: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: POS.border, paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 10 },
  printBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: POS.primary, borderRadius: 12, paddingVertical: 14 },
  printBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: POS.primaryBg, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: POS.primary },
  shareBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: POS.primary },
});
