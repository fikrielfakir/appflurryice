import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, icon, color, bg }: { label: string; value: string; icon: string; color: string; bg: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "30" }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const QUICK_ACTIONS = [
  { title: "New Sale", icon: "shopping-cart", color: C.primary, route: "/pos/products" },
  { title: "Add Expense", icon: "dollar-sign", color: C.secondary, route: "/(tabs)/expenses" },
  { title: "Contacts", icon: "users", color: C.success, route: "/(tabs)/contacts" },
  { title: "Reports", icon: "bar-chart-2", color: C.warning, route: "/(tabs)/reports" },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, sales, totalSales, totalExpenses, totalDue, netProfit, logout } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const recentSales = sales.slice(0, 5);

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
    <View style={styles.screen}>
      <LinearGradient colors={[C.background, C.background]} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <LinearGradient
          colors={["#1A2240", C.background]}
          style={[styles.header, { paddingTop: topInset + 16 }]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                logout();
              }}
            >
              <Feather name="log-out" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Feather name="trending-up" size={14} color={C.primary} />
            <Text style={styles.heroBadgeText}>Today's Overview</Text>
          </View>
          <Text style={styles.heroAmount}>${fmt(totalSales)}</Text>
          <Text style={styles.heroLabel}>Total Revenue</Text>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard label="Expenses" value={`$${fmt(totalExpenses)}`} icon="trending-down" color={C.secondary} bg="rgba(255,138,72,0.12)" />
          <StatCard label="Due Amount" value={`$${fmt(totalDue)}`} icon="clock" color={C.danger} bg="rgba(255,82,82,0.12)" />
          <StatCard label="Net Profit" value={`$${fmt(netProfit)}`} icon="award" color={C.success} bg="rgba(65,211,126,0.12)" />
          <StatCard label="Sales Count" value={`${sales.length}`} icon="shopping-bag" color={C.primary} bg="rgba(76,111,255,0.12)" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.title}
              style={styles.actionCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.route as any);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + "1A" }]}>
                <Feather name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/sales")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="shopping-cart" size={32} color={C.textMuted} />
            <Text style={styles.emptyText}>No sales yet</Text>
          </View>
        ) : (
          recentSales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={[styles.saleAvatar, { backgroundColor: C.primary + "20" }]}>
                <Text style={[styles.saleInitial, { color: C.primary }]}>
                  {sale.customerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.saleInfo}>
                <Text style={styles.saleName}>{sale.customerName}</Text>
                <Text style={styles.saleDate}>
                  {new Date(sale.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleAmount}>${fmt(sale.amount)}</Text>
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
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.textSecondary },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2, textTransform: "capitalize" },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    justifyContent: "center", alignItems: "center",
  },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  heroBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.primary },
  heroAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  heroLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginTop: 20 },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  actionsGrid: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  actionCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, alignItems: "center", gap: 10,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  actionTitle: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textSecondary, textAlign: "center" },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.primary },
  saleCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.card, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border,
  },
  saleAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  saleInitial: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saleInfo: { flex: 1, marginLeft: 12 },
  saleName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  saleDate: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 2 },
  saleRight: { alignItems: "flex-end", gap: 4 },
  saleAmount: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: C.textMuted, fontFamily: "Inter_400Regular", fontSize: 14 },
});
