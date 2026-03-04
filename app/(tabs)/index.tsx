import React, { useState, useMemo } from "react";
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

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, icon, color, bg, isSmall, theme: C }: {
  label: string; value: string; icon: string; color: string; bg: string; isSmall?: boolean; theme: any;
}) {
  return (
    <View style={[styles.statCard(C), { borderColor: color + "30" }, isSmall && styles.statCardSmall]}>
      <View style={[styles.statIcon, { backgroundColor: bg }, isSmall && styles.statIconSmall]}>
        <Feather name={icon as any} size={isSmall ? 14 : 18} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue(C), isSmall && styles.statValueSmall]}>{value}</Text>
        <Text style={[styles.statLabel(C), isSmall && styles.statLabelSmall]}>{label}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, sales, totalSales, totalExpenses, totalDue, netProfit, logout, toggleTheme, isDark } = useApp();
  const C = Colors;
  const [refreshing, setRefreshing] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const recentSales = sales.slice(0, 5);

  const QUICK_ACTIONS = [
    { title: "New Sale", icon: "shopping-cart", color: C.primary, route: "/(tabs)/products" },
    { title: "Add Expense", icon: "dollar-sign", color: C.accent, route: "/(tabs)/expenses" },
    { title: "Contacts", icon: "users", color: C.success, route: "/(tabs)/contacts" },
    { title: "Reports", icon: "bar-chart-2", color: C.warning, route: "/(tabs)/reports" },
  ];

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function statusColor(status: string) {
    if (status === "paid") return C.success;
    if (status === "partial") return C.warning;
    return C.danger;
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <LinearGradient
          colors={[C.accent, C.surface]}
          style={[styles.header, { paddingTop: topInset + 12 }]}
        >
          <View style={styles.headerTopCenter}>
            <Image
              source={require("../../assets/flurry-logo.png")}
              style={styles.headerLogoSmall}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); toggleTheme(); }}
            >
              <Feather name={isDark ? "sun" : "moon"} size={18} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: C.surface, borderColor: C.border, marginTop: 10 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logout(); }}
            >
              <Feather name="log-out" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: C.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.userName, { color: C.textPrimary }]}>{user}</Text>
          </View>

          <View style={[styles.goldSeparator, { backgroundColor: C.accent + "40" }]} />

          <View style={styles.heroBadge}>
            <Feather name="trending-up" size={14} color={C.accent} />
            <Text style={[styles.heroBadgeText, { color: C.accent }]}>Total Revenue</Text>
          </View>
          <Text style={[styles.heroAmount, { color: C.textPrimary }]}>MAD {fmt(totalSales)}</Text>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard theme={C} label="Expenses" value={`MAD ${fmt(totalExpenses)}`} icon="trending-down" color={C.accent} bg={C.accent + "18"} />
            <StatCard theme={C} label="Due Amount" value={`MAD ${fmt(totalDue)}`} icon="clock" color={C.danger} bg={C.danger + "18"} />
          </View>
          <View style={styles.statsRow}>
            <StatCard theme={C} label="Net Profit" value={`MAD ${fmt(netProfit)}`} icon="award" color={C.success} bg={C.success + "18"} isSmall />
            <StatCard theme={C} label="Sales Count" value={`${sales.length}`} icon="shopping-bag" color={C.primary} bg={C.primary + "18"} isSmall />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.title}
              style={[styles.actionCard, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + "1A" }]}>
                <Feather name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={[styles.actionTitle, { color: C.textSecondary }]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary, marginHorizontal: 0 }]}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/sales")}>
            <Text style={[styles.seeAll, { color: C.accent }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="shopping-cart" size={32} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No sales yet</Text>
          </View>
        ) : (
          recentSales.map(sale => (
            <View key={sale.id} style={[styles.saleCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.saleAvatar, { backgroundColor: C.accent + "20" }]}>
                <Text style={[styles.saleInitial, { color: C.accent }]}>
                  {sale.customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.saleInfo}>
                <Text style={[styles.saleName, { color: C.textPrimary }]}>{sale.customerName}</Text>
                <Text style={[styles.saleDate, { color: C.textSecondary }]}>
                  {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={[styles.saleAmount, { color: C.textPrimary }]}>MAD {fmt(sale.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(sale.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(sale.status) }]}>
                    {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTopCenter: { alignItems: "center", marginBottom: 16, width: '100%' },
  headerRight: { position: "absolute", right: 20, top: 50, zIndex: 10, alignItems: 'flex-end' },
  headerLogoSmall: { width: 100, height: 50 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
  greetingRow: { marginBottom: 12 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2, textTransform: "capitalize" },
  goldSeparator: { height: 1.5, marginBottom: 14 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  heroBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  heroAmount: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  statsContainer: { paddingHorizontal: 16, gap: 12, marginTop: 20 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: (C: any) => ({
    flex: 1,
    backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1,
  }),
  statCardSmall: { padding: 12 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statIconSmall: { width: 28, height: 28, marginBottom: 8 },
  statValue: (C: any) => ({ fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 2 }),
  statValueSmall: { fontSize: 15 },
  statLabel: (C: any) => ({ fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary }),
  statLabelSmall: { fontSize: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  actionsGrid: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  actionCard: {
    flex: 1, borderRadius: 16, padding: 14,
    borderWidth: 1, alignItems: "center", gap: 10,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  actionTitle: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saleCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  saleAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  saleInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saleInfo: { flex: 1, marginLeft: 12 },
  saleName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saleDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  saleAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});