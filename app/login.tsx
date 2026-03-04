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
import { Colors } from "@/constants";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const C = Colors;
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
    <View style={[styles.container, { backgroundColor: C.surface }]}>
      <LinearGradient colors={[C.accent, C.surface]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(10,36,99,0.1)", "transparent"]}
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
          <Text style={[styles.tagline, { color: C.primaryLight }]}>Business Management Suite</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Welcome back</Text>
          <Text style={[styles.cardSubtitle, { color: C.textSecondary }]}>Sign in to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: C.textSecondary }]}>Username</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="user" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
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
            <Text style={[styles.label, { color: C.textSecondary }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="lock" size={18} color={C.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.textPrimary }]}
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
            <View style={[styles.errorBox, { backgroundColor: C.danger + "1A" }]}>
              <Feather name="alert-circle" size={14} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[C.primary, C.primaryDark || C.primary]} style={styles.loginButtonGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <View style={[styles.goldAccent, { backgroundColor: C.accent }]} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.goldDivider, { backgroundColor: C.border }]} />

          <View style={styles.hint}>
            <Feather name="info" size={13} color={C.textMuted} />
            <Text style={[styles.hintText, { color: C.textMuted }]}>Initial: basiri / (empty)</Text>
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
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 10, letterSpacing: 0.5 },
  card: {
    borderRadius: 24, padding: 28,
    borderWidth: 1.5,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeButton: { padding: 4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 8, padding: 10, marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loginButton: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  loginButtonGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  loginButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  goldAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 2.5,
  },
  goldDivider: { height: 1.5, marginVertical: 20 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});