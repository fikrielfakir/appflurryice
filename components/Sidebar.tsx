import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { D } from "@/constants/theme";

const ITEM_ACCENTS: Record<string, { color: string; bg: string }> = {
  "/(tabs)/reports":  { color: D.blue,    bg: D.blueBg },
  "/(tabs)/contacts": { color: D.emerald, bg: D.emeraldBg },
  "/(tabs)/debts":    { color: D.rose,    bg: D.roseBg },
  "/settings/screen": { color: D.violet,  bg: D.violetBg },
  "/settings/sync":   { color: D.amber,   bg: D.amberBg },
  "/settings/print-queue": { color: D.heroAccent, bg: D.violetBg },
};

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const insets  = useSafeAreaInsets();
  const pathname = usePathname();
  const { t }   = useTranslation();

  const MENU_ITEMS = [
    { title: t("tabs.reports"),    icon: "bar-chart-2",  route: "/(tabs)/reports"  },
    { title: t("tabs.contacts"),   icon: "users",        route: "/(tabs)/contacts" },
    { title: t("tabs.debts"),      icon: "alert-circle", route: "/(tabs)/debts"    },
    { title: t("settings.screen"), icon: "settings",     route: "/settings/screen" },
    { title: t("settings.sync"),   icon: "cloud",        route: "/settings/sync"   },
    { title: "File d'impression",  icon: "printer",     route: "/settings/print-queue" },
  ];

  if (!isOpen) return null;

  return (
    <View style={S.overlay}>
      {/* Backdrop */}
      <TouchableOpacity style={S.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Drawer */}
      <View style={[S.drawer, { paddingTop: insets.top }]}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />

        {/* Decorative blobs */}
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        {/* ── Header ── */}
        <View style={S.header}>
          <Image
            source={require("../assets/flurry-logo.png")}
            style={S.logo}
            resizeMode="contain"
          />
          <TouchableOpacity style={S.closeBtn} onPress={onClose}>
            <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Hairline */}
        <View style={S.headerDivider} />

        {/* ── Menu items ── */}
        <ScrollView style={S.menuList} showsVerticalScrollIndicator={false}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.route;
            const accent   = ITEM_ACCENTS[item.route] ?? { color: D.inkSoft, bg: "rgba(255,255,255,0.08)" };

            return (
              <TouchableOpacity
                key={item.route}
                style={[S.menuItem, isActive && S.menuItemActive]}
                onPress={() => { router.push(item.route as any); onClose(); }}
                activeOpacity={0.8}
              >
                {/* Active left bar */}
                {isActive && <View style={S.activeBar} />}

                {/* Icon badge */}
                <View style={[S.iconBadge, isActive
                  ? { backgroundColor: accent.bg }
                  : { backgroundColor: "rgba(255,255,255,0.08)" }
                ]}>
                  <Feather
                    name={item.icon as any}
                    size={16}
                    color={isActive ? accent.color : "rgba(255,255,255,0.55)"}
                  />
                </View>

                {/* Label */}
                <Text style={[S.menuTxt, isActive && { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  {item.title}
                </Text>

                {/* Active chevron */}
                {isActive && (
                  <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Footer strip ── */}
        <View style={[S.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={S.footerDivider} />
          <View style={S.footerRow}>
            <View style={S.footerIcon}>
              <Feather name="shield" size={12} color={D.heroAccent} />
            </View>
            <Text style={S.footerTxt}>BizPos · Secure Session</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Drawer
  drawer: {
    width: 272,
    height: "100%",
    overflow: "hidden",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },

  // Blobs
  blob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroAccent, opacity: 0.09, top: -60, right: -60 },
  blob2: { position: "absolute", width: 120, height: 120, borderRadius: 60,  backgroundColor: D.heroGlow,   opacity: 0.06, bottom: 80, left: -40 },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  logo: { width: 120, height: 44 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  headerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 20, marginBottom: 8 },

  // Menu
  menuList: { flex: 1 },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 20,
    gap: 12, position: "relative",
  },
  menuItemActive: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  activeBar: {
    position: "absolute", left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2,
    backgroundColor: D.heroAccent,
  },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  menuTxt: {
    fontSize: 15, fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    flex: 1,
  },

  // Footer
  footer: { paddingHorizontal: 20 },
  footerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 14 },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerIcon: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: "rgba(108,99,255,0.18)",
    justifyContent: "center", alignItems: "center",
  },
  footerTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)" },
});