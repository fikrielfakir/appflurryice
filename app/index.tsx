import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants";

// This screen is never actually "seen" — it just holds the spinner
// while _layout.tsx decides where to navigate.
export default function IndexScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors?.surface || "#F8F9FA", justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator color={Colors?.primary || "#1C439C"} size="large" />
    </View>
  );
}