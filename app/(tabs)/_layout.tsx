import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Sidebar from "@/components/Sidebar";

const C = Colors.dark;

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sales">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Sales</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="products">
        <Icon sf={{ default: "cart", selected: "cart.fill" }} />
        <Label>Products</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="transfers">
        <Icon sf={{ default: "arrow.left.arrow.right", selected: "arrow.left.arrow.right" }} />
        <Label>Transfers</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: C.surface,
            web: C.surface,
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
          title: "Dashboard",
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
          title: "Sales",
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
          title: "Products",
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
          title: "Transfers",
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
        name="expenses"
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <TouchableOpacity 
        style={styles.menuButton} 
        onPress={() => setIsSidebarOpen(true)}
      >
        <Feather name="menu" size={24} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    zIndex: 900,
    backgroundColor: C.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  }
});
