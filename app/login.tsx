import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, loginWithQR } = useApp();
  const [username, setUsername] = useState("basiri");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleQRScan({ data }: { data: string }) {
    setScanning(false);
    setLoading(true);
    try {
      const success = await loginWithQR(data);
      if (!success) {
        setError("Invalid QR Code data");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setError("Failed to process QR Code");
    } finally {
      setLoading(false);
    }
  }

  async function startScanning() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError("Camera permission required for QR login");
        return;
      }
    }
    setScanning(true);
  }

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
      <LinearGradient colors={["#040C20", "#081430", "#0E1C3F"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(212,175,55,0.12)", "transparent"]}
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

          <TouchableOpacity
            style={[styles.qrButton, loading && { opacity: 0.7 }]}
            onPress={startScanning}
            disabled={loading}
          >
            <Feather name="maximize" size={20} color="#D4AF37" />
            <Text style={styles.qrButtonText}>Scan QR Login</Text>
          </TouchableOpacity>

          <Modal visible={scanning} animationType="slide">
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                onBarcodeScanned={handleQRScan}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
              />
              <TouchableOpacity
                style={styles.closeCamera}
                onPress={() => setScanning(false)}
              >
                <Feather name="x" size={30} color="#fff" />
              </TouchableOpacity>
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraText}>Scan your login QR code</Text>
              </View>
            </View>
          </Modal>

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
    backgroundColor: Colors.dark.card,
    borderRadius: 24, padding: 28,
    borderWidth: 1.5, borderColor: "#D4AF3730",
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
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8, padding: 10, marginBottom: 16,
  },
  errorText: { color: Colors.dark.danger, fontSize: 13, fontFamily: "Inter_400Regular" },
  loginButton: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  loginButtonGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  loginButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  goldAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 2.5,
    backgroundColor: "#D4AF37",
  },
  goldDivider: { height: 1.5, backgroundColor: "#D4AF3730", marginVertical: 20 },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  hintText: { color: Colors.dark.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4AF3740",
    backgroundColor: "rgba(212,175,55,0.05)",
  },
  qrButtonText: {
    color: "#D4AF37",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  closeCamera: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  cameraText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
