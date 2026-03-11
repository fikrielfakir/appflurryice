import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Modal, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useApp, AppUser } from "@/context/AppContext";
import { useTranslation } from "react-i18next";

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:         "#F7F6F2",
  surface:    "#FFFFFF",

  heroA:      "#1C1C2E",
  heroB:      "#2D2B55",
  heroAccent: "#6C63FF",
  heroGlow:   "#A78BFA",

  ink:        "#111118",
  inkMid:     "#3D3C52",
  inkSoft:    "#8B8AA5",
  inkGhost:   "#C4C3D0",

  emerald:    "#00B37D",
  emeraldBg:  "#E6FAF4",
  rose:       "#F04E6A",
  roseBg:     "#FEE9ED",
  amber:      "#F59E0B",
  amberBg:    "#FEF3C7",
  violet:     "#8B5CF6",
  violetBg:   "#F5F3FF",

  border:     "#ECEAE4",
  shadow:     "rgba(17,17,24,0.08)",
};

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { setupFromQR, completeSetup } = useApp();
  const { t } = useTranslation();

  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [scanning, setScanning]             = useState(false);
  const [permission, requestPermission]     = useCameraPermissions();
  const [step, setStep]                     = useState<"scan" | "manual">("scan");
  const [tempProfile, setTempProfile]       = useState<Partial<AppUser>>({});
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]             = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  async function handleQRScan({ data }: { data: string }) {
    setScanning(false);
    setLoading(true);
    setError("");
    try {
      const result = await setupFromQR(data);
      if (!result.success || !result.data) {
        setError(t("auth.invalidQRData"));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setTempProfile(result.data);
        setPassword(result.data.password || "");
        setConfirmPassword(result.data.password || "");
        setStep("manual");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setError(t("auth.failedProcessQR"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteSetup() {
    if (password !== confirmPassword) { setError(t("auth.passwordsDoNotMatch")); return; }
    if (password.length < 4)          { setError(t("auth.passwordMinLength"));    return; }
    setLoading(true);
    try {
      const finalProfile: AppUser = {
        id:          tempProfile.id!,
        username:    tempProfile.username!,
        password,
        name:        tempProfile.name        || tempProfile.username!,
        email:       tempProfile.email       || "",
        role:        tempProfile.role        || "",
        business_id: tempProfile.business_id || 0,
        status:      tempProfile.status      || "active",
        locations:   tempProfile.locations   || [],
        created_at:  tempProfile.created_at  || new Date().toISOString(),
      };
      await completeSetup(finalProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError(t("auth.failedSaveProfile"));
    } finally {
      setLoading(false);
    }
  }

  async function startScanning() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) { setError(t("auth.cameraPermissionRequired")); return; }
    }
    setScanning(true);
  }

  // ── Step 2: manual confirm ─────────────────────────────────────────────────
  if (step === "manual") {
    return (
      <View style={S.screen}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[S.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={S.logoArea}>
              <Image source={require("../assets/flurry-logo.png")} style={S.logo} resizeMode="contain" />
              <Text style={S.screenTitle}>{t("auth.accountSetup")}</Text>
              <Text style={S.screenSubtitle}>{t("auth.verifyDetails")}</Text>
            </View>

            {/* Success badge */}
            <View style={S.successBadge}>
              <View style={S.successIcon}>
                <Feather name="check" size={16} color={D.emerald} />
              </View>
              <Text style={S.successTxt}>QR scanné avec succès</Text>
            </View>

            {/* Card */}
            <View style={S.card}>
              <LinearGradient colors={[D.heroAccent, D.heroGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.cardBar} />
              <View style={S.cardBody}>

                {/* Read-only: username */}
                <View style={S.field}>
                  <Text style={S.fieldLbl}>{t("auth.username")}</Text>
                  <View style={[S.inputWrap, S.inputDisabled]}>
                    <View style={S.inputIcon}><Feather name="user" size={15} color={D.inkGhost} /></View>
                    <Text style={S.disabledTxt}>{tempProfile.username}</Text>
                    <View style={S.lockTag}><Feather name="lock" size={10} color={D.inkGhost} /></View>
                  </View>
                </View>

                {/* Read-only: name */}
                <View style={S.field}>
                  <Text style={S.fieldLbl}>{t("auth.fullName")}</Text>
                  <View style={[S.inputWrap, S.inputDisabled]}>
                    <View style={S.inputIcon}><Feather name="briefcase" size={15} color={D.inkGhost} /></View>
                    <Text style={S.disabledTxt}>{tempProfile.name}</Text>
                    <View style={S.lockTag}><Feather name="lock" size={10} color={D.inkGhost} /></View>
                  </View>
                </View>

                {/* Password */}
                <View style={S.field}>
                  <Text style={S.fieldLbl}>{t("auth.setPassword")}</Text>
                  <View style={S.inputWrap}>
                    <View style={S.inputIcon}><Feather name="lock" size={15} color={D.inkSoft} /></View>
                    <TextInput
                      style={S.input}
                      value={password}
                      onChangeText={(v) => { setPassword(v); setError(""); }}
                      secureTextEntry={!showPass}
                      placeholder={t("auth.enterPassword")}
                      placeholderTextColor={D.inkGhost}
                    />
                    <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPass((v) => !v)}>
                      <Feather name={showPass ? "eye-off" : "eye"} size={15} color={D.inkSoft} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={S.field}>
                  <Text style={S.fieldLbl}>{t("auth.confirmPassword")}</Text>
                  <View style={[S.inputWrap, confirmPassword.length > 0 && password !== confirmPassword && S.inputError]}>
                    <View style={S.inputIcon}>
                      <Feather
                        name={confirmPassword.length > 0 && password === confirmPassword ? "check-circle" : "shield"}
                        size={15}
                        color={confirmPassword.length > 0 && password === confirmPassword ? D.emerald : D.inkSoft}
                      />
                    </View>
                    <TextInput
                      style={S.input}
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setError(""); }}
                      secureTextEntry={!showConfirm}
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      placeholderTextColor={D.inkGhost}
                    />
                    <TouchableOpacity style={S.eyeBtn} onPress={() => setShowConfirm((v) => !v)}>
                      <Feather name={showConfirm ? "eye-off" : "eye"} size={15} color={D.inkSoft} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error */}
                {error ? (
                  <View style={S.errorBox}>
                    <Feather name="alert-circle" size={13} color={D.rose} />
                    <Text style={S.errorTxt}>{error}</Text>
                  </View>
                ) : null}

                {/* Complete button */}
                <TouchableOpacity
                  style={[S.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleCompleteSetup}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[D.heroAccent, "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.primaryBtnInner}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Feather name="check-circle" size={17} color="#fff" /><Text style={S.primaryBtnTxt}>{t("auth.completeSetup")}</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back */}
                <TouchableOpacity style={S.backBtn} onPress={() => { setStep("scan"); setError(""); }}>
                  <Feather name="arrow-left" size={14} color={D.inkSoft} />
                  <Text style={S.backBtnTxt}>{t("auth.backToScanner")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 1: scan ──────────────────────────────────────────────────────────
  return (
    <View style={S.screen}>
      <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
      <View style={S.blob1} pointerEvents="none" />
      <View style={S.blob2} pointerEvents="none" />
      <View style={S.blob3} pointerEvents="none" />

      <View style={[S.scanContent, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>

        {/* Logo */}
        <View style={S.logoArea}>
          <Image source={require("../assets/flurry-logo.png")} style={S.logo} resizeMode="contain" />
          <Text style={S.screenTitle}>{t("auth.appSetup")}</Text>
          <Text style={S.screenSubtitle}>{t("auth.scanBusinessQR")}</Text>
        </View>

        {/* Card */}
        <View style={S.card}>
          <LinearGradient colors={[D.heroAccent, D.heroGlow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.cardBar} />
          <View style={S.cardBody}>

            {/* QR scan button */}
            <TouchableOpacity
              style={[S.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={startScanning}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[D.heroAccent, "#4F46E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.primaryBtnInner}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Feather name="maximize" size={20} color="#fff" /><Text style={S.primaryBtnTxt}>{t("auth.scanSetupQR")}</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Error */}
            {error ? (
              <View style={S.errorBox}>
                <Feather name="alert-circle" size={13} color={D.rose} />
                <Text style={S.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {/* Divider */}
            <View style={S.divider} />

            {/* Info box */}
            <View style={S.infoBox}>
              <View style={[S.infoIcon, { backgroundColor: D.violetBg }]}>
                <Feather name="info" size={14} color={D.heroAccent} />
              </View>
              <Text style={S.infoTxt}>{t("auth.adminQRInfo")}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Camera modal */}
      <Modal visible={scanning} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleQRScan}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <TouchableOpacity style={S.closeCam} onPress={() => setScanning(false)}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={S.camOverlay}>
            <Text style={S.camTxt}>{t("auth.scanSetupQRCode")}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.heroA },

  blob1: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: D.heroAccent, opacity: 0.08, top: -100, right: -100 },
  blob2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroGlow,   opacity: 0.06, bottom: 60, left: -80 },
  blob3: { position: "absolute", width: 120, height: 120, borderRadius: 60,  backgroundColor: D.heroAccent, opacity: 0.05, top: "40%", left: -30 },

  // Scan step layout
  scanContent: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  // Manual step layout
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },

  // Logo area
  logoArea:      { alignItems: "center", marginBottom: 32 },
  logo:          { width: 180, height: 90 },
  screenTitle:   { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 20, textAlign: "center" },
  screenSubtitle:{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 6, textAlign: "center" },

  // Success badge (step 2)
  successBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  successIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: D.emeraldBg, justifyContent: "center", alignItems: "center" },
  successTxt:   { fontSize: 13, fontFamily: "Inter_500Medium", color: D.emerald },

  // Card
  card: {
    backgroundColor: D.surface,
    borderRadius: 24, overflow: "hidden",
    borderWidth: 1, borderColor: D.border,
    elevation: 12,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 24,
  },
  cardBar:  { height: 4 },
  cardBody: { padding: 24, gap: 4 },

  // Fields
  field:    { marginBottom: 16 },
  fieldLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 },

  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: D.bg, borderRadius: 13,
    borderWidth: 1, borderColor: D.border, height: 50,
  },
  inputDisabled: { backgroundColor: "#F1F0EC", borderColor: "transparent" },
  inputError:    { borderColor: D.rose + "80" },
  inputIcon:     { width: 42, justifyContent: "center", alignItems: "center" },
  input:         { flex: 1, color: D.ink, fontFamily: "Inter_400Regular", fontSize: 15, paddingRight: 4 },
  eyeBtn:        { width: 42, height: 50, justifyContent: "center", alignItems: "center" },

  disabledTxt: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: D.inkSoft },
  lockTag:     { width: 28, height: 50, justifyContent: "center", alignItems: "center" },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: D.roseBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: D.rose + "30", marginBottom: 4,
  },
  errorTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.rose, flex: 1 },

  // Primary button
  primaryBtn:      { borderRadius: 14, overflow: "hidden", marginBottom: 4, marginTop: 8 },
  primaryBtnInner: { height: 54, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  primaryBtnTxt:   { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // Back button
  backBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  backBtnTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: D.inkSoft },

  // Divider + info
  divider: { height: 1, backgroundColor: D.border, marginVertical: 20 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon:{ width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  infoTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft, flex: 1, lineHeight: 20 },

  // Camera
  closeCam:   { position: "absolute", top: 50, right: 20, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" },
  camOverlay: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  camTxt:     { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22 },
});