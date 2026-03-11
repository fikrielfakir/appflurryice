import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Sale } from "@/context/AppContext";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";
import { D } from "@/constants/theme";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface DebtorGroup {
  customerName: string;
  customerPhone: string;
  totalDue: number;
  totalPaid: number;
  totalAmount: number;
  invoiceCount: number;
  sales: Sale[];
}

const AVATAR_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose, D.violet];

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, setIsSidebarOpen } = useApp();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<DebtorGroup | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const debtors = useMemo<DebtorGroup[]>(() => {
    const map = new Map<string, DebtorGroup>();
    for (const sale of sales) {
      if (sale.status === "paid") continue;
      const due = sale.amount - sale.paid;
      if (due <= 0) continue;
      const key = sale.customerName;
      if (!map.has(key)) {
        map.set(key, {
          customerName: sale.customerName,
          customerPhone: sale.customerPhone ?? "",
          totalDue: 0,
          totalPaid: 0,
          totalAmount: 0,
          invoiceCount: 0,
          sales: [],
        });
      }
      const g = map.get(key)!;
      g.totalDue += due;
      g.totalPaid += sale.paid;
      g.totalAmount += sale.amount;
      g.invoiceCount += 1;
      g.sales.push(sale);
    }
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search.trim()) return debtors;
    const q = search.toLowerCase();
    return debtors.filter(
      d =>
        d.customerName.toLowerCase().includes(q) ||
        d.customerPhone.includes(q),
    );
  }, [debtors, search]);

  const totalAllDue = useMemo(
    () => debtors.reduce((s, d) => s + d.totalDue, 0),
    [debtors],
  );

  function openCustomer(item: DebtorGroup) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCustomer(item);
  }

  function goBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCustomer(null);
  }

  if (selectedCustomer) {
    return (
      <View style={{ flex: 1, backgroundColor: D.bg }}>
        <LinearGradient
          colors={[D.heroA, D.heroB]}
          style={[S.detailHero, { paddingTop: topInset + 12 }]}
        >
          <TouchableOpacity style={S.backBtn} onPress={goBack} activeOpacity={0.8}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={S.detailHeroName} numberOfLines={1}>
              {selectedCustomer.customerName}
            </Text>
            {selectedCustomer.customerPhone ? (
              <Text style={S.detailHeroPhone}>{selectedCustomer.customerPhone}</Text>
            ) : null}
          </View>

          <View style={S.heroDuePill}>
            <Text style={S.heroDuePillLabel}>{t("debts.totalDue")}</Text>
            <Text style={S.heroDuePillAmount}>{fmt(selectedCustomer.totalDue)}</Text>
          </View>
        </LinearGradient>

        <View style={S.detailChipsRow}>
          <SummaryChip
            label={t("debts.invoices")}
            value={String(selectedCustomer.invoiceCount)}
            color={D.violet}
          />
          <SummaryChip
            label={t("debts.totalAmount")}
            value={fmt(selectedCustomer.totalAmount)}
            color={D.blue}
          />
          <SummaryChip
            label={t("debts.paid")}
            value={fmt(selectedCustomer.totalPaid)}
            color={D.emerald}
          />
        </View>

        <FlatList
          data={selectedCustomer.sales}
          keyExtractor={s => s.id}
          contentContainerStyle={S.detailList}
          renderItem={({ item }) => {
            const due = item.amount - item.paid;
            const isPartial = item.status === "partial";
            const accentColor = isPartial ? D.amber : D.rose;
            const accentBg = isPartial ? D.amberBg : D.roseBg;

            return (
              <View style={S.invoiceCard}>
                <View style={[S.invoiceStrip, { backgroundColor: accentColor }]} />
                <View style={S.invoiceBody}>
                  <View style={S.invoiceTopRow}>
                    <Text style={S.invoiceNum}>#{item.invoiceNumber}</Text>
                    <View style={[S.statusBadge, { backgroundColor: accentBg }]}>
                      <Text style={[S.statusBadgeTxt, { color: accentColor }]}>
                        {isPartial ? t("sales.partialStatus") : t("sales.dueStatus")}
                      </Text>
                    </View>
                  </View>

                  <Text style={S.invoiceDate}>
                    {new Date(item.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>

                  <View style={S.dividerThin} />

                  <AmountLine label={t("debts.totalAmount")} value={fmt(item.amount)} color={D.inkMid} />
                  <AmountLine label={t("debts.paid")} value={fmt(item.paid)} color={D.emerald} />
                  <AmountLine
                    label={t("debts.remaining")}
                    value={fmt(due)}
                    color={D.rose}
                    bold
                  />
                </View>
              </View>
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      <AppHeader title={t("debts.title")} onMenuPress={() => setIsSidebarOpen(true)} />

      <LinearGradient
        colors={[D.heroA, D.heroB]}
        style={[S.summaryHero, { paddingTop: topInset + 56 }]}
      >
        <View style={S.summaryInner}>
          <View style={S.summaryIconWrap}>
            <Feather name="alert-circle" size={22} color={D.rose} />
          </View>
          <View>
            <Text style={S.summaryLabel}>{t("debts.totalOutstanding")}</Text>
            <Text style={S.summaryAmount}>{fmt(totalAllDue)}</Text>
          </View>
        </View>
        <Text style={S.summaryMeta}>
          {debtors.length} {t("debts.customersWithDue")}
        </Text>
      </LinearGradient>

      <View style={S.searchWrap}>
        <View style={S.searchBox}>
          <Feather name="search" size={15} color={D.inkSoft} style={{ marginRight: 8 }} />
          <TextInput
            style={S.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t("common.search")}
            placeholderTextColor={D.inkGhost}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={D.inkSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={d => d.customerName}
        contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 80 }]}
        ListEmptyComponent={
          <View style={S.empty}>
            <Feather name="check-circle" size={52} color={D.emerald} />
            <Text style={S.emptyTitle}>{t("debts.allClear")}</Text>
            <Text style={S.emptySub}>{t("debts.allClearSub")}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const initials = item.customerName
            .split(" ")
            .map(w => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <TouchableOpacity
              style={S.card}
              onPress={() => openCustomer(item)}
              activeOpacity={0.82}
            >
              <View style={[S.avatar, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[S.avatarTxt, { color: avatarColor }]}>{initials}</Text>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={S.customerName} numberOfLines={1}>
                  {item.customerName}
                </Text>
                {item.customerPhone ? (
                  <Text style={S.customerPhone}>{item.customerPhone}</Text>
                ) : null}
                <Text style={S.invoiceHint}>
                  {item.invoiceCount} {t("debts.unpaidInvoices")}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={S.dueAmount}>{fmt(item.totalDue)}</Text>
                <Feather name="chevron-right" size={15} color={D.inkGhost} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[S.chip, { borderColor: color + "40", backgroundColor: color + "12" }]}>
      <Text style={[S.chipLabel, { color }]}>{label}</Text>
      <Text style={[S.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

function AmountLine({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <View style={S.amountLine}>
      <Text style={S.amountLineLabel}>{label}</Text>
      <Text style={[S.amountLineValue, { color }, bold ? { fontFamily: "Inter_700Bold" } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  summaryHero: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(240,78,106,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summaryAmount: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  summaryMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 6,
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: D.ink,
  },

  list: {
    padding: 16,
    gap: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 10,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTxt: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  customerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
  },
  customerPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
  },
  invoiceHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: D.inkGhost,
  },
  dueAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.rose,
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  detailHero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailHeroName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  detailHeroPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  heroDuePill: {
    backgroundColor: "rgba(240,78,106,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(240,78,106,0.3)",
  },
  heroDuePillLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroDuePillAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.rose,
  },

  detailChipsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  chip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  detailList: {
    padding: 16,
    gap: 10,
  },

  invoiceCard: {
    flexDirection: "row",
    backgroundColor: D.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  invoiceStrip: {
    width: 4,
  },
  invoiceBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  invoiceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  invoiceNum: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  invoiceDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    marginBottom: 6,
  },
  dividerThin: {
    height: 1,
    backgroundColor: D.border,
    marginVertical: 8,
  },
  amountLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  amountLineLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
  },
  amountLineValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
