import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/context/AppContext";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants";
import { loadSavedLanguage } from "@/i18n";
import { RootSiblingParent } from 'react-native-root-siblings';
import "@/i18n";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoggedIn, isLoading: appLoading, needsSetup } = useApp();
  const theme = Colors;
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().then(() => setIsI18nReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const isReady = fontsLoaded && isI18nReady && !appLoading;

  // Navigate once everything is ready
  useEffect(() => {
    if (!isReady) return;
    if (needsSetup) router.replace("/setup");
    else if (isLoggedIn) router.replace("/(tabs)");
    else router.replace("/login");
  }, [isReady, needsSetup, isLoggedIn]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme?.surface || "#F8F9FA" },
        // ✅ This prevents the screen content from rendering during transitions
        animation: "none",
      }}
    >
      {/* ✅ Index screen acts as a pure loading gate — no content flashes */}
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pos" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="settings/printer" />
      <Stack.Screen name="settings/sync" />
      <Stack.Screen name="settings/screen" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootSiblingParent>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <RootLayoutNav />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </RootSiblingParent>
    </ErrorBoundary>
  );
}