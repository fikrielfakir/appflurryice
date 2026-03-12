import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, Share, TextInput, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp, Sale } from "@/context/AppContext";
import { Colors } from "@/constants";
import { AppHeader } from "@/components/common/AppHeader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusMeta(status: string, t: any) {
  if (status === "paid")    return { color: D.emerald, bg: D.emeraldBg, label: t("sales.paidStatus") || "Paid" };
  if (status === "partial") return { color: D.amber,   bg: D.amberBg,   label: t("sales.partialStatus") || "Partial" };
  return                           { color: D.rose,    bg: D.roseBg,    label: t("sales.dueStatus") || "Due" };
}

const AVATAR_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose, D.violet];

// ── Sale Card ─────────────────────────────────────────────────────────────────
function SaleCard({
  sale, index, onDelete, onShare, onReturn, t,
}: {
  sale: Sale; index: number;
  onDelete: () => void; onShare: () => void; onReturn: () => void; t: any;
}) {
  const due = sale.amount - sale.paid;
  const meta = statusMeta(sale.status, t);
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = sale.customerName.slice(0, 2).toUpperCase();

  const handleCall = () => {
    if (!sale.customerPhone) return;
    if (Platform.OS === "web") { (window as any).open(`tel:${sale.customerPhone}`); }
    else { Linking.openURL(`tel:${sale.customerPhone}`); }
  };

  const handlePrint = () => {
    router.push({
      pathname: "/pos/invoice",
      params: {
        invoiceNumber:  sale.invoiceNumber,
        customerName:   sale.customerName,
        customerPhone:  sale.customerPhone || "",
        total:          sale.amount.toString(),
        paid:           sale.paid.toString(),
        remaining:      (sale.amount - sale.paid).toString(),
        status:         sale.status,
        paymentMethod:  sale.paymentMethod,
        date:           sale.date,
        itemsJson:      JSON.stringify(sale.items),
        discount:       (sale.discount || 0).toString(),
        returnAmount:   (sale.returnAmount || 0).toString(),
      },
    });
  };

  const handleEdit = () => {
    router.push({ pathname: "/(tabs)/products", params: { editSaleId: sale.id } });
  };

  return (
    <View style={S.card}>
      {/* Left accent strip */}
      <View style={[S.cardStrip, { backgroundColor: avatarColor }]} />

      <View style={S.cardInner}>

        {/* ── Top row ── */}
        <View style={S.cardTop}>
          <View style={[S.avatar, { backgroundColor: avatarColor + "18" }]}>
            <Text style={[S.avatarTxt, { color: avatarColor }]}>{initials}</Text>
          </View>
          <View style={S.cardTopMid}>
            <Text style={S.customerName} numberOfLines={1}>{sale.customerName}</Text>
            <Text style={S.invoiceNum}>#{sale.invoiceNumber}</Text>
          </View>
          <View style={[S.statusBadge, { backgroundColor: meta.bg }]}>
            <View style={[S.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[S.statusTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* ── Amounts ── */}
        <View style={S.amountsRow}>
          <View style={S.amountBlock}>
            <Text style={S.amountLbl}>Total</Text>
            <Text style={[S.amountVal, { color: D.heroAccent }]}>MAD {fmt(sale.amount)}</Text>
          </View>
          <View style={S.amountDivider} />
          <View style={S.amountBlock}>
            <Text style={S.amountLbl}>Payé</Text>
            <Text style={[S.amountVal, { color: D.ink }]}>MAD {fmt(sale.paid)}</Text>
          </View>
          <View style={S.amountDivider} />
          <View style={S.amountBlock}>
            <Text style={S.amountLbl}>Reste</Text>
            <Text style={[S.amountVal, { color: due > 0 ? D.rose : D.emerald }]}>
              MAD {fmt(due)}
            </Text>
          </View>
        </View>

        {/* ── Meta chips ── */}
        <View style={S.metaRow}>
          <View style={S.metaChip}>
            <Feather name="credit-card" size={11} color={D.inkSoft} />
            <Text style={S.metaChipTxt}>{sale.paymentMethod}</Text>
          </View>
          {sale.customerPhone ? (
            <View style={S.metaChip}>
              <Feather name="phone" size={11} color={D.inkSoft} />
              <Text style={S.metaChipTxt}>{sale.customerPhone}</Text>
            </View>
          ) : null}
          <View style={S.metaChip}>
            <Feather name="calendar" size={11} color={D.inkSoft} />
            <Text style={S.metaChipTxt}>
              {new Date(sale.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* ── Items preview ── */}
        {sale.items && sale.items.length > 0 && (
          <View style={S.itemsPreview}>
            {sale.items.slice(0, 2).map((item, i) => (
              <View key={i} style={S.itemRow}>
                <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={S.itemQty}>×{item.qty}</Text>
                <Text style={S.itemPrice}>MAD {fmt(item.qty * item.price)}</Text>
              </View>
            ))}
            {sale.items.length > 2 && (
              <Text style={S.itemsMore}>+{sale.items.length - 2} article(s)</Text>
            )}
          </View>
        )}

        {/* ── Actions ── */}
        <View style={S.actions}>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.amberBg }]} onPress={onReturn}>
            <Feather name="corner-up-left" size={15} color={D.amber} />
          </TouchableOpacity>
          {sale.customerPhone ? (
            <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.emeraldBg }]} onPress={handleCall}>
              <Feather name="phone" size={15} color={D.emerald} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.blueBg }]} onPress={onShare}>
            <Feather name="share-2" size={15} color={D.blue} />
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.violetBg }]} onPress={handlePrint}>
            <Feather name="printer" size={15} color={D.violet} />
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.blueBg }]} onPress={handleEdit}>
            <Feather name="edit-2" size={15} color={D.blue} />
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.roseBg }]} onPress={onDelete}>
            <Feather name="trash-2" size={15} color={D.rose} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { sales, deleteSale, setIsSidebarOpen } = useApp();
  const { t } = useTranslation();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [filter, setFilter]                       = useState<"all" | "paid" | "partial" | "due">("all");
  const [search, setSearch]                       = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete]           = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = filter === "all" ? sales : sales.filter((s) => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => s.customerName.toLowerCase().includes(q) || s.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return result;
  }, [sales, filter, search]);

  const paidCount    = sales.filter((s) => s.status === "paid").length;
  const partialCount = sales.filter((s) => s.status === "partial").length;
  const dueCount     = sales.filter((s) => s.status === "due").length;
  const total        = sales.length || 1;

  async function handleShare(sale: Sale) {
    try {
      const text = [
        `Facture #${sale.invoiceNumber}`,
        `Client: ${sale.customerName}`,
        `Total: MAD ${fmt(sale.amount)}`,
        `Payé: MAD ${fmt(sale.paid)}`,
        `Statut: ${sale.status.toUpperCase()}`,
        ...sale.items.map((i) => `  ${i.name} x${i.qty} = MAD ${fmt(i.qty * i.price)}`),
      ].join("\n");
      await Share.share({ message: text });
    } catch {}
  }

  const FILTERS: { key: "all" | "paid" | "partial" | "due"; label: string; color: string }[] = [
    { key: "all",     label: t("sales.all") || "Tout",    color: D.heroAccent },
    { key: "paid",    label: t("sales.paid") || "Payé",   color: D.emerald },
    { key: "partial", label: t("sales.partial") || "Partiel", color: D.amber },
    { key: "due",     label: t("sales.due") || "Impayé",  color: D.rose },
  ];

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero: gradient + blobs + AppHeader + stats + search + filters ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        {/* Decorative blobs */}
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        {/* AppHeader sits INSIDE the hero so the gradient flows behind it */}
        <AppHeader
          title={t("sales.title")}
          dark
          showMenu
          onMenuPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSidebarOpen(true);
          }}
          rightActions={
            <TouchableOpacity
              style={S.hBtn}
              onPress={() => {/* print all / export */}}
              activeOpacity={0.75}
            >
              <Feather name="printer" size={17} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          }
        />

        {/* ── Summary strip ── */}
        <View style={S.heroStats}>
          {[
            { count: paidCount,    label: t("sales.paid") || "Payés",    color: D.emerald, bg: D.emerald + "30" },
            { count: partialCount, label: t("sales.partial") || "Partiels", color: D.amber, bg: D.amber + "30" },
            { count: dueCount,     label: t("sales.due") || "Impayés",   color: D.rose,   bg: D.rose + "30"   },
          ].map((st) => (
            <View key={st.label} style={S.heroStat}>
              <View style={[S.heroStatIcon, { backgroundColor: st.bg }]}>
                <Text style={[S.heroStatNum, { color: st.color }]}>{st.count}</Text>
              </View>
              <Text style={S.heroStatLbl}>{st.label}</Text>
            </View>
          ))}

          <View style={S.heroStatDivider} />

          <View style={S.heroTotal}>
            <Text style={S.heroTotalNum}>{sales.length}</Text>
            <Text style={S.heroTotalLbl}>{t("sales.totalSales") || "Total ventes"}</Text>
          </View>
        </View>

        {/* ── 3-segment progress bar ── */}
        <View style={S.progressBar}>
          <View style={[S.progressSeg, { flex: paidCount / total,    backgroundColor: D.emerald }]} />
          <View style={[S.progressSeg, { flex: partialCount / total, backgroundColor: D.amber }]} />
          <View style={[S.progressSeg, { flex: dueCount / total,     backgroundColor: D.rose }]} />
        </View>

        {/* ── Search ── */}
        <View style={S.searchWrap}>
          <Feather name="search" size={14} color={D.inkSoft} style={{ marginRight: 8 }} />
          <TextInput
            style={S.searchInput}
            placeholder={t("sales.searchPlaceholder") || "Rechercher par client ou facture…"}
            placeholderTextColor={D.inkGhost}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={D.inkSoft} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter pills ── */}
        <View style={S.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                S.filterPill,
                filter === f.key && { backgroundColor: "#fff", borderColor: "transparent" },
              ]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
              activeOpacity={0.8}
            >
              {filter === f.key && <View style={[S.filterDot, { backgroundColor: f.color }]} />}
              <Text style={[
                S.filterTxt,
                filter === f.key && { color: D.heroB, fontFamily: "Inter_700Bold" },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Sale list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + bottomInset }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item, index }) => (
          <SaleCard
            sale={item}
            index={index}
            t={t}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSaleToDelete(item.id);
              setShowDeleteConfirm(true);
            }}
            onShare={() => handleShare(item)}
            onReturn={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowReturnConfirm(true);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <View style={S.emptyIcon}>
              <MaterialCommunityIcons name="receipt" size={30} color={D.inkSoft} />
            </View>
            <Text style={S.emptyTitle}>{t("sales.noSales") || "Aucune vente trouvée"}</Text>
            <Text style={S.emptyDesc}>{t("sales.noSalesDesc") || "Les ventes apparaîtront ici"}</Text>
          </View>
        }
      />

      {/* ── Confirm modals ── */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title={t("sales.deleteSale") || "Supprimer la vente"}
        message={t("sales.removeInvoice") || "Supprimer cette facture ?"}
        confirmText={t("common.delete") || "Supprimer"}
        cancelText={t("common.cancel") || "Annuler"}
        type="danger"
        onConfirm={() => {
          if (saleToDelete) {
            deleteSale(saleToDelete);
            Toast.show(t("pos.saleDeleted") || "Vente supprimée", { duration: Toast.durations.SHORT });
          }
          setShowDeleteConfirm(false);
          setSaleToDelete(null);
        }}
        onCancel={() => { setShowDeleteConfirm(false); setSaleToDelete(null); }}
      />

      <ConfirmModal
        visible={showReturnConfirm}
        title={t("sales.return") || "Retour"}
        message={t("sales.returnComingSoon") || "Fonctionnalité bientôt disponible."}
        confirmText={t("common.ok") || "OK"}
        cancelText={t("common.cancel") || "Annuler"}
        type="info"
        onConfirm={() => setShowReturnConfirm(false)}
        onCancel={() => setShowReturnConfirm(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // ── Hero ──
  // overflow:hidden clips the blobs; NO backgroundColor so gradient shows through
  hero: { overflow: "hidden" },

  blob1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60,
  },
  blob2: {
    position: "absolute", width: 110, height: 110, borderRadius: 55,
    backgroundColor: D.heroGlow, opacity: 0.07, bottom: 20, left: -30,
  },

  // AppHeader right-side button — frosted glass to match Products / Reports
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  // ── Stats strip ──
  heroStats: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 6,
  },
  heroStat:     { alignItems: "center", gap: 4, flex: 1 },
  heroStatIcon: { width: 46, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  heroStatNum:  { fontSize: 16, fontFamily: "Inter_700Bold" },
  heroStatLbl:  { color: "rgba(255,255,255,0.45)", fontSize: 9, fontFamily: "Inter_400Regular" },
  heroStatDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 4 },
  heroTotal:    { alignItems: "center", gap: 4, paddingLeft: 4 },
  heroTotalNum: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  heroTotalLbl: { color: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "Inter_400Regular" },

  // ── Progress bar ──
  progressBar: {
    flexDirection: "row", height: 4,
    marginHorizontal: 20, borderRadius: 2, overflow: "hidden", gap: 2,
    marginBottom: 14,
  },
  progressSeg: { height: 4, borderRadius: 2, minWidth: 4 },

  // ── Search ──
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, height: 42,
    marginHorizontal: 16, marginBottom: 12,
  },
  searchInput: { flex: 1, color: D.ink, fontSize: 14, fontFamily: "Inter_400Regular" },

  // ── Filter pills ──
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  filterPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterTxt: { color: "rgba(255,255,255,0.78)", fontSize: 12, fontFamily: "Inter_500Medium" },

  // ── Sale card ──
  card: {
    flexDirection: "row",
    backgroundColor: D.card,
    borderRadius: 18, borderWidth: 1, borderColor: D.border,
    overflow: "hidden",
    elevation: 2,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 12 },

  cardTop:    { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar:     { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  avatarTxt:  { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardTopMid: { flex: 1 },
  customerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },
  invoiceNum:   { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },

  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },

  amountsRow: {
    flexDirection: "row",
    backgroundColor: D.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: D.border,
  },
  amountBlock:   { flex: 1, alignItems: "center" },
  amountDivider: { width: 1, backgroundColor: D.border, marginHorizontal: 8 },
  amountLbl:     { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft, marginBottom: 3 },
  amountVal:     { fontSize: 14, fontFamily: "Inter_700Bold" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: D.border,
  },
  metaChipTxt: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkMid },

  itemsPreview: {
    backgroundColor: D.bg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: D.border, gap: 5,
  },
  itemRow:   { flexDirection: "row", alignItems: "center" },
  itemName:  { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkMid },
  itemQty:   { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginHorizontal: 8 },
  itemPrice: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.ink },
  itemsMore: { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },

  actions: {
    flexDirection: "row", gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: D.border,
  },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },

  // ── Empty state ──
  empty:     { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: D.surface,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: D.border,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  emptyDesc:  { fontSize: 13, fontFamily: "Inter_400Regular",  color: D.inkSoft },
});