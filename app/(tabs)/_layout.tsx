import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View, TouchableOpacity, I18nManager } from "react-native";
import React from "react";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/context/AppContext";
import { useTranslation } from "react-i18next";

function NativeTabLayout() {
  const { t, i18n } = useTranslation();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t('tabs.dashboard')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sales">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>{t('tabs.sales')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} />
        <Label>{t('tabs.products')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transfers">
        <Icon sf={{ default: "arrow.left.arrow.right", selected: "arrow.left.arrow.right" }} />
        <Label>{t('tabs.transfers')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ theme: C }: { theme: any }) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tabActive,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: C.tabBar,
            web: C.tabBar,
          }),
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 0,
          height: Platform.OS === "web" ? 84 : 60 + insets.bottom,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            Platform.OS === "ios"
              ? <SymbolView name="house.fill" tintColor={color} size={size} />
              : <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: t('tabs.sales'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            Platform.OS === "ios"
              ? <SymbolView name="creditcard.fill" tintColor={color} size={size} />
              : <Feather name="shopping-cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: t('tabs.products'),
          tabBarIcon: ({ color, size }) => (
            Platform.OS === "ios"
              ? <SymbolView name="cart.fill" tintColor={color} size={size} />
              : <Feather name="package" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transfers/index"
        options={{
          title: t('tabs.transfers'),
          tabBarIcon: ({ color, size }) => (
            Platform.OS === "ios"
              ? <SymbolView name="arrow.left.arrow.right" tintColor={color} size={size} />
              : <Feather name="repeat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="reports"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSidebarOpen, setIsSidebarOpen } = useApp();
  const C = Colors;

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout theme={C} />}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 900,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  }
});