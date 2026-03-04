import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.light;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [username, setUsername] = useState("basiri");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Please enter your credentials");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = await login(username.trim(), password);
      if (!success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Invalid username or password");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.accent, C.background]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(28,67,156,0.1)", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "45%" }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.logoArea}>
          <Image
            source={require("../assets/flurry-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Business Management Suite</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={t => { setUsername(t); setError(""); }}
                placeholder="Enter username"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={t => { setPassword(t); setError(""); }}
                placeholder="Enter password"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={C.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#2952C4", "#1A3C8F", "#0D2260"]} style={styles.loginButtonGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <View style={styles.goldAccent} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.goldDivider} />

          <View style={styles.hint}>
            <Feather name="info" size={13} color={C.textMuted} />
            <Text style={styles.hintText}>Initial: basiri / (empty)</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 36 },
  logo: { width: 200, height: 110 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4AF37", marginTop: 10, letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 24, padding: 28,
    borderWidth: 1.5, borderColor: Colors.light.border,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.light.background,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.light.text, fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeButton: { padding: 4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(220,53,69,0.1)",
    borderRadius: 8, padding: 10, marginBottom: 16,
  },
  errorText: { color: Colors.light.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  loginButton: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  loginButtonGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  loginButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  goldAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 2.5,
    backgroundColor: Colors.light.secondary,
  },
  goldDivider: { height: 1.5, backgroundColor: Colors.light.border, marginVertical: 20 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  hintText: { color: Colors.light.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
});
