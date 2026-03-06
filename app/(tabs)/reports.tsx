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

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, products, setIsSidebarOpen } = useApp();
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('daily');

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const saleDay = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      
      if (filter === 'daily') {
        return saleDay.getTime() === today.getTime();
      }
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <LinearGradient colors={[C.primary, C.primaryDark, C.surface]} style={[styles.header, { paddingTop: 16 }]}>
          <View style={styles.filterRow}>
            {(['daily', 'weekly', 'monthly', 'all'] as const).map(f => {
              const getLabel = () => {
                const lang = i18n.language;
                if (f === 'daily') return lang === 'ar' ? 'اليوم' : lang === 'fr' ? "Aujourd'hui" : 'Today';
                if (f === 'weekly') return lang === 'ar' ? 'أسبوع' : lang === 'fr' ? 'Semaine' : 'Weekly';
                if (f === 'monthly') return lang === 'ar' ? 'شهر' : lang === 'fr' ? 'Mois' : 'Monthly';
                return lang === 'ar' ? 'الكل' : lang === 'fr' ? 'Tout' : 'All';
              };
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
                >
                  <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                    {getLabel()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{i18n.language === 'ar' ? 'المخزون المتبقي في الشاحنة' : i18n.language === 'fr' ? 'Stock restant du camion' : 'Truck Remaining Stock'}</Text>
          <View style={styles.metricsGrid}>
            <MetricCard 
              label={i18n.language === 'ar' ? 'عدد المنتجات' : i18n.language === 'fr' ? 'Nombre de produits' : 'Products Count'} 
              value={`${truckStats.count}`} 
              icon="package" 
              color={C.primaryLight} 
            />
            <MetricCard 
              label={i18n.language === 'ar' ? 'القيمة المتبقية' : i18n.language === 'fr' ? 'Valeur restante' : 'Remaining Value'} 
              value={`MAD ${fmt(truckStats.value)}`} 
              icon="truck" 
              color={C.accent} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{i18n.language === 'ar' ? 'الملخص المالي' : i18n.language === 'fr' ? 'Résumé financier' : 'Financial Summary'}</Text>
          <View style={styles.metricsGrid}>
            <MetricCard 
              label={i18n.language === 'ar' ? 'الإيرادات' : i18n.language === 'fr' ? 'Revenus' : 'Revenue'} 
              value={`MAD ${fmt(stats.rev)}`} 
              icon="trending-up" 
              color={C.primaryLight} 
              sub={`${filteredSales.length} ${i18n.language === 'ar' ? 'مبيعات' : i18n.language === 'fr' ? 'ventes' : 'sales'}`} 
            />
            <MetricCard 
              label={i18n.language === 'ar' ? 'المبلغ المستحق' : i18n.language === 'fr' ? 'Montant dû' : 'Amount Due'} 
              value={`MAD ${fmt(stats.due)}`} 
              icon="clock" 
              color={C.warning} 
              sub={`${dueSalesCount} ${i18n.language === 'ar' ? 'غير مدفوع' : i18n.language === 'fr' ? 'impayé' : 'unpaid'}`} 
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{i18n.language === 'ar' ? 'المبيعات حسب الحالة' : i18n.language === 'fr' ? 'Ventes par statut' : 'Sales by Status'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusCard, { borderColor: C.success + "30" }]}>
              <Text style={[styles.statusCount, { color: C.success }]}>{paidSalesCount}</Text>
              <Text style={styles.statusLabel}>{i18n.language === 'ar' ? 'مدفوعة' : i18n.language === 'fr' ? 'Payée' : 'Paid'}</Text>
            </View>
            <View style={[styles.statusCard, { borderColor: C.warning + "30" }]}>
              <Text style={[styles.statusCount, { color: C.warning }]}>{partialSalesCount}</Text>
              <Text style={styles.statusLabel}>{i18n.language === 'ar' ? 'جزئية' : i18n.language === 'fr' ? 'Partielle' : 'Partial'}</Text>
            </View>
            <View style={[styles.statusCard, { borderColor: C.danger + "30" }]}>
              <Text style={[styles.statusCount, { color: C.danger }]}>{dueSalesCount}</Text>
              <Text style={styles.statusLabel}>{i18n.language === 'ar' ? 'مستحقة' : i18n.language === 'fr' ? 'Due' : 'Due'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
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
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 12 },
  statusRow: { flexDirection: "row", gap: 10 },
  statusCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: "center", gap: 4,
  },
  statusCount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statusLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
});
