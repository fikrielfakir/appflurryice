import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Modal, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { setupFromQR } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleQRScan({ data }: { data: string }) {
    setScanning(false);
    setLoading(true);
    setError("");
    try {
      const result = await setupFromQR(data);
      if (!result.success) {
        setError(result.error || "Invalid QR Code data");
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
        setError("Camera permission required for setup");
        return;
      }
    }
    setScanning(true);
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#040C20", "#081430", "#0E1C3F"]} style={StyleSheet.absoluteFill} />
      
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.logoArea}>
          <Image
            source={require("../assets/flurry-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>App Setup</Text>
          <Text style={styles.subtitle}>Scan your business QR code to begin</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.qrButton, loading && { opacity: 0.7 }]}
            onPress={startScanning}
            disabled={loading}
          >
            <LinearGradient colors={["#2952C4", "#1A3C8F", "#0D2260"]} style={styles.buttonGradient}>
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
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={Colors.dark.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color="#D4AF37" />
            <Text style={styles.infoText}>
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 20 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 8, textAlign: "center" },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 24, padding: 32,
    borderWidth: 1.5, borderColor: "#D4AF3730",
  },
  qrButton: { borderRadius: 16, overflow: "hidden" },
  buttonGradient: { height: 64, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  qrButtonText: { color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12, padding: 12, marginTop: 20,
  },
  errorText: { color: Colors.dark.danger, fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoBox: {
    flexDirection: "row", gap: 12,
    backgroundColor: "rgba(212,175,55,0.05)",
    borderRadius: 16, padding: 16, marginTop: 32,
    borderWidth: 1, borderColor: "#D4AF3720",
  },
  infoText: { color: Colors.dark.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  closeCamera: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 10 },
  cameraOverlay: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  cameraText: {
    color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold",
    backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
});
