import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";

const C = Colors;

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MetricCard({ label, value, icon, color, sub, arLabel }: { label: string; value: string; icon: string; color: string; sub?: string; arLabel?: string }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: C.card, borderColor: color + "30" }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: C.textPrimary }]}>{value}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.metricLabel, { color: C.textSecondary }]}>{label}</Text>
        {arLabel && <Text style={[styles.metricArLabel, { color: C.textSecondary }]}>{arLabel}</Text>}
      </View>
      {sub ? <Text style={[styles.metricSub, { color: C.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'sell': return '#10B981';
    case 'transfer_in': return '#3B82F6';
    case 'transfer_out': return '#EF4444';
    case 'adjustment': return '#F97316';
    default: return C.primary;
  }
};

const getTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case 'sell': return t('reports.sale');
    case 'transfer_in': return t('reports.transferIn');
    case 'transfer_out': return t('reports.transferOut');
    case 'adjustment': return t('reports.adjustment');
    default: return type;
  }
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, transactions, products, setIsSidebarOpen } = useApp();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');
  const [activeTab, setActiveTab] = useState<'metrics' | 'transactions'>('metrics');

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const saleDay = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      
      if (filter === 'daily') return saleDay.getTime() === today.getTime();
      if (filter === 'weekly') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return saleDay >= weekAgo;
      }
      if (filter === 'monthly') {
        return saleDay.getMonth() === today.getMonth() && saleDay.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }, [sales, filter]);

  const stats = useMemo(() => {
    const rev = filteredSales.reduce((s, x) => s + x.amount, 0);
    const due = filteredSales.reduce((s, x) => s + (x.amount - x.paid), 0);
    return { rev, due };
  }, [filteredSales]);

  const truckStats = useMemo(() => {
    const inStockProducts = products.filter(p => (p.stock || 0) > 0);
    const count = inStockProducts.length;
    const value = inStockProducts.reduce((s, p) => s + ((p.stock || 0) * (p.price || 0)), 0);
    return { count, value };
  }, [products]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return transactions.filter(t => {
      const d = new Date(t.date);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      
      if (filter === 'daily') return day.getTime() === today.getTime();
      if (filter === 'weekly') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return day >= weekAgo;
      }
      if (filter === 'monthly') {
        return day.getMonth() === today.getMonth() && day.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }, [transactions, filter]);

  const paidSalesCount = filteredSales.filter(s => s.status === "paid").length;
  const dueSalesCount = filteredSales.filter(s => s.status === "due").length;
  const partialSalesCount = filteredSales.filter(s => s.status === "partial").length;

  return (
    <View style={[styles.screen, { backgroundColor: C.surface }]}>
      <AppHeader
        title={t('reports.title')}
        dark
        showBack
        onBackPress={() => router.back()}
        showMenu
        onMenuPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsSidebarOpen(true);
        }}
      />
      <View style={styles.tabHeader}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'metrics' && styles.tabBtnActive]} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('metrics'); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'metrics' && styles.tabBtnTextActive]}>
            {t('reports.metrics')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'transactions' && styles.tabBtnActive]} 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('transactions'); }}
        >
          <Text style={[styles.tabBtnText, activeTab === 'transactions' && styles.tabBtnTextActive]}>
            {t('reports.logs')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <LinearGradient colors={[C.primary, C.primaryDark, C.surface]} style={[styles.header, { paddingTop: 16 }]}>
          <View style={styles.filterRow}>
            {(['daily', 'weekly', 'monthly', 'all'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
              >
                <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                  {t(`reports.${f}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {activeTab === 'metrics' ? (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('reports.truckStock')}</Text>
              <View style={styles.metricsGrid}>
                <MetricCard 
                  label={t('reports.productsCount')} 
                  value={`${truckStats.count}`} 
                  icon="package" 
                  color={C.primaryLight} 
                />
                <MetricCard 
                  label={t('reports.remainingValue')} 
                  value={`MAD ${fmt(truckStats.value)}`} 
                  icon="truck" 
                  color={C.accent} 
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('reports.financialSummary')}</Text>
              <View style={styles.metricsGrid}>
                <MetricCard 
                  label={t('reports.revenue')} 
                  value={`MAD ${fmt(stats.rev)}`} 
                  icon="trending-up" 
                  color={C.primaryLight} 
                  sub={`${filteredSales.length} ${t('tabs.sales')}`} 
                />
                <MetricCard 
                  label={t('reports.amountDue')} 
                  value={`MAD ${fmt(stats.due)}`} 
                  icon="clock" 
                  color={C.warning} 
                  sub={`${dueSalesCount} ${t('reports.unpaid')}`} 
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reports.salesByStatus')}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusCard, { borderColor: C.success + "30" }]}>
                  <Text style={[styles.statusCount, { color: C.success }]}>{paidSalesCount}</Text>
                  <Text style={styles.statusLabel}>{t('reports.paid')}</Text>
                </View>
                <View style={[styles.statusCard, { borderColor: C.warning + "30" }]}>
                  <Text style={[styles.statusCount, { color: C.warning }]}>{partialSalesCount}</Text>
                  <Text style={styles.statusLabel}>{t('reports.partial')}</Text>
                </View>
                <View style={[styles.statusCard, { borderColor: C.danger + "30" }]}>
                  <Text style={[styles.statusCount, { color: C.danger }]}>{dueSalesCount}</Text>
                  <Text style={styles.statusLabel}>{t('reports.due')}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('reports.transactionLogs')}</Text>
            <View style={styles.tableCard}>
              <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
                <Text style={[styles.th, { flex: 1.5 }]}>{t('reports.ref')}</Text>
                <Text style={[styles.th, { flex: 2 }]}>{t('reports.product')}</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('reports.qty')}</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('reports.rem')}</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>{t('reports.type')}</Text>
              </View>
              {filteredTransactions.length === 0 ? (
                <View style={styles.emptyTable}>
                  <Text style={{ color: C.textMuted }}>{t('reports.noTransactions')}</Text>
                </View>
              ) : (
                filteredTransactions.map((tx) => {
                  const typeColor = getTypeColor(tx.type);
                  return (
                    <View key={tx.id} style={[styles.tableRow, { backgroundColor: typeColor + '15', borderBottomColor: typeColor + '40' }]}>
                      <View style={{ flex: 1.5 }}>
                        <Text style={styles.tdRef} numberOfLines={1}>{tx.referenceNo}</Text>
                        <Text style={styles.tdDate}>{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                      </View>
                      <Text style={[styles.td, { flex: 2 }]} numberOfLines={2}>{tx.productName}</Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'center', color: tx.quantity < 0 ? C.danger : C.success, fontWeight: '600' }]}>
                        {tx.quantity}
                      </Text>
                      <Text style={[styles.td, { flex: 1, textAlign: 'center', color: C.textSecondary }]}>
                        {tx.remainingStock ?? '-'}
                      </Text>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor + '25' }]}>
                          <Text style={[styles.typeText, { color: typeColor }]}>
                            {getTypeLabel(tx.type, t)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  tabHeader: { flexDirection: 'row', backgroundColor: C.surface, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.primary },
  tabBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.textSecondary },
  tabBtnTextActive: { color: C.primary },
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterBtnActive: { backgroundColor: '#fff' },
  filterBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_500Medium' },
  filterBtnTextActive: { color: C.primary },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 0, gap: 10, marginTop: 8 },
  metricCard: {
    flex: 1, minWidth: "45%", backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, gap: 4,
  },
  metricIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  metricValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  metricLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary },
  metricArLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.textSecondary },
  metricSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.textMuted, marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0c3683", marginBottom: 12 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  statusCount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  tableCard: { backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border },
  tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 8 },
  th: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: C.textMuted },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  td: { fontSize: 13, fontFamily: 'Inter_500Medium', color: C.textPrimary },
  tdRef: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  tdDate: { fontSize: 10, fontFamily: 'Inter_400Regular', color: C.textMuted },
  emptyTable: { padding: 40, alignItems: 'center' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
});
