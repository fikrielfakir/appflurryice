import { Stack } from "expo-router";
import React from "react";

export default function POSLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F5F5" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="cart" />
      <Stack.Screen name="customer" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="invoice" />
    </Stack>
  );
}
