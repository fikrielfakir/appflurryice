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
import "@/i18n";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoggedIn, isLoading, needsSetup } = useApp();
  const theme = Colors;

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      if (needsSetup) router.replace("/setup");
      else if (isLoggedIn) router.replace("/(tabs)");
      else router.replace("/login");
    }
  }, [isLoggedIn, isLoading, needsSetup]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme?.surface || "#F8F9FA", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme?.primary || "#1C439C"} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme?.surface || "#F8F9FA" } }}>
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

import { RootSiblingParent } from 'react-native-root-siblings';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    loadSavedLanguage().then(() => setIsI18nReady(true));
  }, []);

  useEffect(() => {
    if (!fontsLoaded) SplashScreen.preventAutoHideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded || !isI18nReady) return null;

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