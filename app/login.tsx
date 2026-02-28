import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
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
      <LinearGradient
        colors={["#0B0F1A", "#131929", "#1A2240"]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(76,111,255,0.15)", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: "50%" }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="bar-chart" size={36} color={Colors.dark.primary} />
          </View>
          <Text style={styles.appName}>BizPOS</Text>
          <Text style={styles.tagline}>Business Management Suite</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={18} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={t => { setUsername(t); setError(""); }}
                placeholder="Enter username"
                placeholderTextColor={Colors.dark.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={18} color={Colors.dark.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={t => { setPassword(t); setError(""); }}
                placeholder="Enter password"
                placeholderTextColor={Colors.dark.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.dark.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={Colors.dark.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#5B7FFF", "#4C6FFF", "#3D5EEE"]}
              style={styles.loginButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.hint}>
            <Feather name="info" size={13} color={Colors.dark.textMuted} />
            <Text style={styles.hintText}>Demo: admin / admin123</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(76,111,255,0.15)",
    borderWidth: 1, borderColor: "rgba(76,111,255,0.3)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.dark.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeButton: { padding: 4 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,82,82,0.1)",
    borderRadius: 8, padding: 10, marginBottom: 16,
  },
  errorText: { color: Colors.dark.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  loginButton: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  loginButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  hint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center", marginTop: 20,
  },
  hintText: { color: Colors.dark.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
});
