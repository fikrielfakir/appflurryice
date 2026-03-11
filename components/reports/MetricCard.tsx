import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

const D = {
  card:      "#FFFFFF",
  ink:       "#111118",
  inkSoft:   "#8B8AA5",
  inkGhost:  "#C4C3D0",
  border:    "#ECEAE4",
  shadow:    "rgba(17,17,24,0.06)",
};

export interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  sub?: string;
}

export const MetricCard = memo(function MetricCard({
  label,
  value,
  icon,
  color,
  bg,
  sub,
}: MetricCardProps) {
  return (
    <View style={S.card}>
      <View style={[S.iconWrap, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={S.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={S.label} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={S.sub} numberOfLines={1}>{sub}</Text> : null}
      <View style={[S.accent, { backgroundColor: color }]} />
    </View>
  );
});

const S = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: D.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: D.border,
    gap: 4,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: D.ink,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: D.inkSoft,
  },
  sub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: D.inkGhost,
    marginTop: 2,
  },
  accent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
});
