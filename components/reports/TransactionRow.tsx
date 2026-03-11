import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Transaction } from "@/context/AppContext";

const D = {
  ink:        "#111118",
  inkSoft:    "#8B8AA5",
  inkGhost:   "#C4C3D0",
  border:     "#ECEAE4",
  emerald:    "#00B37D",
  emeraldBg:  "#E6FAF4",
  rose:       "#F04E6A",
  roseBg:     "#FEE9ED",
  blue:       "#3B82F6",
  blueBg:     "#EFF6FF",
  orange:     "#F97316",
  orangeBg:   "#FFF3E8",
  heroAccent: "#6C63FF",
  violetBg:   "#F5F3FF",
};

function getTypeColor(type: string): string {
  switch (type) {
    case "sell":         return D.emerald;
    case "transfer_in":  return D.blue;
    case "transfer_out": return D.rose;
    case "adjustment":   return D.orange;
    default:             return D.heroAccent;
  }
}

function getTypeBg(type: string): string {
  switch (type) {
    case "sell":         return D.emeraldBg;
    case "transfer_in":  return D.blueBg;
    case "transfer_out": return D.roseBg;
    case "adjustment":   return D.orangeBg;
    default:             return D.violetBg;
  }
}

export interface TransactionRowProps {
  item: Transaction;
  typeLabel: string;
  isLast: boolean;
}

export const TransactionRow = memo(function TransactionRow({
  item,
  typeLabel,
  isLast,
}: TransactionRowProps) {
  const color = getTypeColor(item.type);
  const bg    = getTypeBg(item.type);

  return (
    <View
      style={[
        S.card,
        isLast && { borderBottomWidth: 0, marginBottom: 0 },
      ]}
    >
      <View style={[S.strip, { backgroundColor: color }]} />

      <View style={[S.badge, { backgroundColor: bg }]}>
        <Text style={[S.badgeTxt, { color }]}>{typeLabel}</Text>
      </View>

      <View style={S.mid}>
        <Text style={S.product} numberOfLines={1}>
          {item.productName}
        </Text>
        <View style={S.meta}>
          <Text style={S.ref}>{item.referenceNo}</Text>
          <View style={S.dot} />
          <Text style={S.date}>
            {new Date(item.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      <View style={S.right}>
        <Text
          style={[S.qty, { color: item.quantity < 0 ? D.rose : D.emerald }]}
        >
          {item.quantity > 0 ? "+" : ""}
          {item.quantity}
        </Text>
        <Text style={S.rem}>
          {item.remainingStock ?? "—"}{" "}
          <Text style={S.remUnit}>rest.</Text>
        </Text>
      </View>
    </View>
  );
});

const S = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingRight: 16,
    paddingLeft: 4,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    gap: 10,
  },
  strip:    { width: 3, height: 36, borderRadius: 3 },
  badge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },
  mid:      { flex: 1 },
  product:  {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    marginBottom: 3,
  },
  meta:     { flexDirection: "row", alignItems: "center", gap: 6 },
  ref:      { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  dot:      { width: 3, height: 3, borderRadius: 1.5, backgroundColor: D.inkGhost },
  date:     { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  right:    { alignItems: "flex-end", gap: 3 },
  qty:      { fontSize: 15, fontFamily: "Inter_700Bold" },
  rem:      { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft },
  remUnit:  { color: D.inkGhost },
});
