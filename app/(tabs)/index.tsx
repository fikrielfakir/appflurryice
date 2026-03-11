import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, RefreshControl, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import { useTranslation } from "react-i18next";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  // Backgrounds
  bg:           "#F7F6F2",       // warm ivory
  surface:      "#FFFFFF",
  card:         "#FFFFFF",

  // Hero
  heroA:        "#1C1C2E",       // deep navy-black
  heroB:        "#2D2B55",       // deep indigo
  heroAccent:   "#6C63FF",       // soft violet
  heroGlow:     "#A78BFA",

  // Ink
  ink:          "#111118",
  inkMid:       "#3D3C52",
  inkSoft:      "#8B8AA5",
  inkGhost:     "#C4C3D0",

  // Semantic
  emerald:      "#00B37D",
  emeraldBg:    "#E6FAF4",
  rose:         "#F04E6A",
  roseBg:       "#FEE9ED",
  amber:        "#F59E0B",
  amberBg:      "#FEF3C7",
  blue:         "#3B82F6",
  blueBg:       "#EFF6FF",
  violet:       "#8B5CF6",
  violetBg:     "#F5F3FF",

  // Structure
  border:       "#ECEAE4",
  borderStrong: "#D9D6CC",
  shadow:       "rgba(17,17,24,0.06)",
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, sales, totalSales, totalExpenses, totalDue, netProfit, logout, setIsSidebarOpen } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const recentSales = sales.slice(0, 5);

  const QUICK_ACTIONS = [
    { title: t("dashboard.newSale"),    icon: "shopping-cart", color: D.heroAccent, bg: D.violetBg,  route: "/(tabs)/products"  },
    { title: t("dashboard.addExpense"), icon: "minus-circle",  color: D.rose,       bg: D.roseBg,    route: "/(tabs)/expenses"  },
    { title: t("tabs.contacts"),        icon: "users",         color: D.emerald,    bg: D.emeraldBg, route: "/(tabs)/contacts"  },
    { title: t("tabs.reports"),         icon: "bar-chart-2",   color: D.blue,       bg: D.blueBg,    route: "/(tabs)/reports"   },
  ];

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("dashboard.goodMorning") :
    hour < 18 ? t("dashboard.goodAfternoon") :
    t("dashboard.goodEvening");

  function statusMeta(status: string) {
    if (status === "paid")    return { color: D.emerald, bg: D.emeraldBg, label: "Payé" };
    if (status === "partial") return { color: D.amber,   bg: D.amberBg,   label: "Partiel" };
    return                           { color: D.rose,    bg: D.roseBg,    label: "Impayé" };
  }

  const profitPositive = netProfit >= 0;

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={D.heroAccent} />}
      >

        {/* ── HERO ── */}
        <View style={[S.hero, { paddingTop: topInset + 8 }]}>
          <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />

          {/* Decorative circles */}
          <View style={[S.deco1]} pointerEvents="none" />
          <View style={[S.deco2]} pointerEvents="none" />
          <View style={[S.deco3]} pointerEvents="none" />

          {/* Top bar */}
          <View style={S.heroTopBar}>
            <TouchableOpacity
              style={S.iconBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsSidebarOpen(true); }}
            >
              <Feather name="menu" size={19} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <Image
              source={require("../../assets/flurry-logo.png")}
              style={S.logo}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={S.iconBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logout(); }}
            >
              <Feather name="log-out" size={19} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={S.heroGreeting}>
            <Text style={S.heroGreetTxt}>{greeting},</Text>
            <Text style={S.heroUserTxt}>{user}</Text>
          </View>

          {/* Revenue card inside hero */}
          <View style={S.revenueCard}>
            <View style={S.revenueLeft}>
              <View style={S.revenueLabelRow}>
                <View style={S.revenueDot} />
                <Text style={S.revenueLabel}>{t("dashboard.totalRevenue")}</Text>
              </View>
              <Text style={S.revenueAmount}>MAD</Text>
              <Text style={S.revenueValue}>{fmt(totalSales)}</Text>
            </View>
            <View style={S.revenueDivider} />
            <View style={S.revenueRight}>
              <View style={S.miniStat}>
                <View style={[S.miniStatIcon, { backgroundColor: profitPositive ? D.emerald + "30" : D.rose + "30" }]}>
                  <Feather name={profitPositive ? "trending-up" : "trending-down"} size={13} color={profitPositive ? D.heroGlow : D.rose} />
                </View>
                <View>
                  <Text style={S.miniStatLbl}>{t("dashboard.netProfit")}</Text>
                  <Text style={[S.miniStatVal, { color: profitPositive ? D.heroGlow : "#F87171" }]}>
                    {fmt(netProfit)}
                  </Text>
                </View>
              </View>
              <View style={S.miniStat}>
                <View style={[S.miniStatIcon, { backgroundColor: D.rose + "30" }]}>
                  <Feather name="clock" size={13} color="#F87171" />
                </View>
                <View>
                  <Text style={S.miniStatLbl}>{t("dashboard.dueAmount")}</Text>
                  <Text style={[S.miniStatVal, { color: "#F87171" }]}>{fmt(totalDue)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── KPI STRIP ── */}
        <View style={S.kpiStrip}>
          <View style={[S.kpiCard, { borderLeftColor: D.rose }]}>
            <View style={[S.kpiIcon, { backgroundColor: D.roseBg }]}>
              <Feather name="trending-down" size={15} color={D.rose} />
            </View>
            <Text style={S.kpiVal}>MAD {fmt(totalExpenses)}</Text>
            <Text style={S.kpiLbl}>{t("dashboard.expenses")}</Text>
          </View>

          <View style={[S.kpiCard, { borderLeftColor: D.blue }]}>
            <View style={[S.kpiIcon, { backgroundColor: D.blueBg }]}>
              <Feather name="shopping-bag" size={15} color={D.blue} />
            </View>
            <Text style={S.kpiVal}>{sales.length}</Text>
            <Text style={S.kpiLbl}>{t("dashboard.salesCount")}</Text>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionTitle}>{t("dashboard.quickActions")}</Text>
        </View>

        <View style={S.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.title}
              style={S.actionCard}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
              activeOpacity={0.82}
            >
              <View style={[S.actionIconWrap, { backgroundColor: action.bg }]}>
                <Feather name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={S.actionTitle}>{action.title}</Text>
              <View style={[S.actionArrow, { backgroundColor: action.bg }]}>
                <Feather name="arrow-right" size={12} color={action.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── RECENT SALES ── */}
        <View style={[S.sectionHeader, { marginTop: 28 }]}>
          <Text style={S.sectionTitle}>{t("dashboard.recentSales")}</Text>
          <TouchableOpacity style={S.seeAllBtn} onPress={() => router.push("/(tabs)/sales")}>
            <Text style={S.seeAllTxt}>{t("dashboard.seeAll")}</Text>
            <Feather name="arrow-right" size={13} color={D.heroAccent} />
          </TouchableOpacity>
        </View>

        {recentSales.length === 0 ? (
          <View style={S.emptyState}>
            <View style={S.emptyIcon}>
              <Feather name="shopping-cart" size={28} color={D.inkSoft} />
            </View>
            <Text style={S.emptyTitle}>{t("dashboard.noSales")}</Text>
            <Text style={S.emptyDesc}>Vos ventes apparaîtront ici</Text>
          </View>
        ) : (
          <View style={S.salesList}>
            {recentSales.map((sale, index) => {
              const meta = statusMeta(sale.status);
              const initials = sale.customerName.slice(0, 2).toUpperCase();
              // Cycle avatar accent colors
              const avatarColors = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose];
              const avatarColor = avatarColors[index % avatarColors.length];

              return (
                <View key={sale.id} style={[S.saleCard, index === recentSales.length - 1 && { marginBottom: 0 }]}>
                  {/* Left colored strip */}
                  <View style={[S.saleStrip, { backgroundColor: avatarColor }]} />

                  {/* Avatar */}
                  <View style={[S.saleAvatar, { backgroundColor: avatarColor + "18" }]}>
                    <Text style={[S.saleInitials, { color: avatarColor }]}>{initials}</Text>
                  </View>

                  {/* Info */}
                  <View style={S.saleInfo}>
                    <Text style={S.saleName} numberOfLines={1}>{sale.customerName}</Text>
                    <Text style={S.saleDate}>
                      {new Date(sale.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>

                  {/* Right */}
                  <View style={S.saleRight}>
                    <Text style={S.saleAmount}>MAD {fmt(sale.amount)}</Text>
                    <View style={[S.statusBadge, { backgroundColor: meta.bg }]}>
                      <View style={[S.statusDot, { backgroundColor: meta.color }]} />
                      <Text style={[S.statusTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    overflow: "hidden",
  },

  // Decorative blobs
  deco1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: D.heroAccent,
    opacity: 0.12,
    top: -60, right: -60,
  },
  deco2: {
    position: "absolute", width: 140, height: 140, borderRadius: 70,
    backgroundColor: D.heroGlow,
    opacity: 0.08,
    bottom: 20, left: -40,
  },
  deco3: {
    position: "absolute", width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FFFFFF",
    opacity: 0.04,
    top: 80, left: "45%",
  },

  heroTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  logo: { width: 90, height: 40 },

  heroGreeting: { marginBottom: 22 },
  heroGreetTxt: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  heroUserTxt: {
    fontSize: 26,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    marginTop: 3,
    textTransform: "capitalize",
    letterSpacing: -0.5,
  },

  // Revenue card
  revenueCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  revenueLeft: { flex: 1.2, justifyContent: "center" },
  revenueLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  revenueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.heroAccent },
  revenueLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.8, textTransform: "uppercase" },
  revenueAmount: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  revenueValue: { color: "#FFFFFF", fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -1 },

  revenueDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 16 },

  revenueRight: { flex: 1, justifyContent: "space-around" },
  miniStat: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniStatIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  miniStatLbl: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Inter_400Regular" },
  miniStatVal: { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 1 },

  // ── KPI Strip ─────────────────────────────────────────────────────────────
  kpiStrip: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 20,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: D.border,
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    gap: 6,
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 9,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  kpiVal: { fontSize: 15, fontFamily: "Inter_700Bold", color: D.ink },
  kpiLbl: { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    letterSpacing: -0.3,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: D.heroAccent },

  // ── Quick actions ─────────────────────────────────────────────────────────
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  actionCard: {
    width: "47%",
    backgroundColor: D.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: D.border,
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    gap: 12,
  },
  actionIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
    alignSelf: "flex-start",
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
    lineHeight: 17,
  },
  actionArrow: {
    width: 26, height: 26, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    alignSelf: "flex-end",
  },

  // ── Recent sales ──────────────────────────────────────────────────────────
  salesList: {
    marginHorizontal: 16,
    backgroundColor: D.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.border,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  saleCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  saleStrip: {
    width: 3,
    height: 40,
    borderRadius: 3,
    marginRight: 12,
  },
  saleAvatar: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  saleInitials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  saleInfo: { flex: 1, marginLeft: 12 },
  saleName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  saleDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },
  saleRight: { alignItems: "flex-end", gap: 5 },
  saleAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: D.ink },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: D.bg,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
    borderWidth: 1, borderColor: D.border,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft },
});