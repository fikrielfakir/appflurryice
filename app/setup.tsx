import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp, AppUser } from "@/context/AppContext";
import { Colors } from "@/constants";

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { setupFromQR, completeSetup } = useApp();
  const C = Colors;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [step, setStep] = useState<"scan" | "manual">("scan");
  const [tempProfile, setTempProfile] = useState<Partial<AppUser>>({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleQRScan({ data }: { data: string }) {
    setScanning(false);
    setLoading(true);
    setError("");
    try {
      const result = await setupFromQR(data);
      if (!result.success || !result.data) {
        setError(result.error || "Invalid QR Code data");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setTempProfile(result.data);
        setPassword(result.data.password || "");
        setConfirmPassword(result.data.password || "");
        setStep("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setError("Failed to process QR Code");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSetup() {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      const finalProfile: AppUser = {
        id: tempProfile.id!,
        username: tempProfile.username!,
        password: password,
        name: tempProfile.name || tempProfile.username!,
        email: tempProfile.email || "",
        role: tempProfile.role || "",
        business_id: tempProfile.business_id || 0,
        status: tempProfile.status || "active",
        locations: tempProfile.locations || [],
        created_at: tempProfile.created_at || new Date().toISOString(),
      };
      
      await completeSetup(finalProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError("Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  async function startScanning() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError("Camera permission required for setup");
        return;
      }
    }
    setScanning(true);
  }

  if (step === "manual") {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: C.surface }]}
      >
        <LinearGradient colors={[C.accent, C.surface]} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: 40 }]}>
          <View style={styles.logoArea}>
            <Image source={require("../assets/flurry-logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.title, { color: C.textPrimary }]}>Account Setup</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>Verify your details and set a password</Text>
          </View>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.inputGroup, { marginBottom: 20 }]}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Username</Text>
                <View style={[styles.inputWrapper, styles.disabledInput, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="user" size={18} color={C.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.disabledText, { color: C.textSecondary }]}>{tempProfile.username}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Full Name</Text>
                <View style={[styles.inputWrapper, styles.disabledInput, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="info" size={18} color={C.textMuted} style={styles.inputIcon} />
                  <Text style={[styles.disabledText, { color: C.textSecondary }]}>{tempProfile.name}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Set Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="lock" size={18} color={C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: C.textPrimary }]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter password"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: C.textSecondary }]}>Confirm Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Feather name="check-circle" size={18} color={C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: C.textPrimary }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Confirm password"
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: C.danger + "1A" }]}>
                  <Feather name="alert-circle" size={14} color={C.danger} />
                  <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
                </View>
              ) : null}

            <TouchableOpacity
              style={[styles.qrButton, loading && { opacity: 0.7 }]}
              onPress={handleCompleteSetup}
              disabled={loading}
            >
              <LinearGradient colors={[C.primary, C.primaryDark || C.primary]} style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.qrButtonText}>Complete Setup</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep("scan")} style={styles.backButton}>
              <Text style={[styles.backButtonText, { color: C.textMuted }]}>Back to Scanner</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.surface }]}>
      <LinearGradient colors={[C.accent, C.surface]} style={StyleSheet.absoluteFill} />
      
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.logoArea}>
          <Image
            source={require("../assets/flurry-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: C.textPrimary }]}>App Setup</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Scan your business QR code to begin</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity
            style={[styles.qrButton, loading && { opacity: 0.7 }]}
            onPress={startScanning}
            disabled={loading}
          >
            <LinearGradient colors={[C.primary, C.primaryDark || C.primary]} style={styles.buttonGradient}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="maximize" size={24} color="#fff" />
                  <Text style={styles.qrButtonText}>Scan Setup QR</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: C.danger + "1A" }]}>
              <Feather name="alert-circle" size={14} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.infoBox, { backgroundColor: C.primaryLight + "0D", borderColor: C.primaryLight + "33" }]}>
            <Feather name="info" size={16} color={C.primaryLight} />
            <Text style={[styles.infoText, { color: C.textSecondary }]}>
              Your administrator should provide you with a unique QR code to initialize your profile and business settings.
            </Text>
          </View>
        </View>
      </View>

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
            <Text style={styles.cameraText}>Scan your setup QR code</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 40 },
  logo: { width: 220, height: 120 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 20 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "center" },
  card: {
    borderRadius: 24, padding: 32,
    borderWidth: 1.5,
  },
  qrButton: { borderRadius: 16, overflow: "hidden" },
  buttonGradient: { height: 64, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  qrButtonText: { color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, marginTop: 20,
  },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoBox: {
    flexDirection: "row", gap: 12,
    borderRadius: 16, padding: 16, marginTop: 32,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  closeCamera: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 10 },
  cameraOverlay: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  cameraText: {
    color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold",
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  disabledInput: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "transparent" },
  disabledText: { fontFamily: "Inter_400Regular", fontSize: 15 },
  backButton: { marginTop: 16, alignItems: "center" },
  backButtonText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});