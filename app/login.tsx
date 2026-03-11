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

  border:     "#ECEAE4",
  shadow:     "rgba(17,17,24,0.08)",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const { t } = useTranslation();

  const [username, setUsername]       = useState("basiri");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError(t('auth.pleaseFillCredentials'));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = await login(username.trim(), password);
      if (!success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(t('auth.invalidCredentials'));
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={S.screen}>
      {/* Full-screen dark gradient background */}
      <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />

      {/* Decorative blobs */}
      <View style={S.blob1} pointerEvents="none" />
      <View style={S.blob2} pointerEvents="none" />
      <View style={S.blob3} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[S.kav, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        {/* ── Logo area ── */}
        <View style={S.logoArea}>
          <Image
            source={require("../assets/flurry-logo.png")}
            style={S.logo}
            resizeMode="contain"
          />
          <Text style={S.tagline}>{t('auth.tagline')}</Text>
        </View>

        {/* ── Login card ── */}
        <View style={S.card}>
          {/* Card top accent bar */}
          <LinearGradient
            colors={[D.heroAccent, D.heroGlow]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.cardAccentBar}
          />

          <View style={S.cardBody}>
            <Text style={S.cardTitle}>{t('auth.welcomeBack')}</Text>
            <Text style={S.cardSubtitle}>{t('auth.loginSubtitle')}</Text>

            {/* Username */}
            <View style={S.field}>
              <Text style={S.fieldLbl}>{t('auth.username')}</Text>
              <View style={S.inputWrap}>
                <View style={S.inputIcon}>
                  <Feather name="user" size={16} color={D.inkSoft} />
                </View>
                <TextInput
                  style={S.input}
                  value={username}
                  onChangeText={(v) => { setUsername(v); setError(""); }}
                  placeholder={t('auth.usernamePlaceholder')}
                  placeholderTextColor={D.inkGhost}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={S.field}>
              <Text style={S.fieldLbl}>{t('auth.password')}</Text>
              <View style={S.inputWrap}>
                <View style={S.inputIcon}>
                  <Feather name="lock" size={16} color={D.inkSoft} />
                </View>
                <TextInput
                  style={S.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={D.inkGhost}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={D.inkSoft} />
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

            {/* Login button */}
            <TouchableOpacity
              style={[S.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[D.heroAccent, "#4F46E5"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={S.loginBtnInner}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <Text style={S.loginBtnTxt}>{t('auth.loginButton')}</Text>
                      <Feather name="arrow-right" size={17} color="rgba(255,255,255,0.85)" />
                    </>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.heroA },

  // Decorative blobs
  blob1: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: D.heroAccent, opacity: 0.08, top: -100, right: -100 },
  blob2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroGlow,   opacity: 0.06, bottom: 60, left: -80 },
  blob3: { position: "absolute", width: 120, height: 120, borderRadius: 60,  backgroundColor: D.heroAccent, opacity: 0.05, top: "40%", left: -30 },

  kav:      { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  // Logo
  logoArea: { alignItems: "center", marginBottom: 36 },
  logo:     { width: 180, height: 90 },
  tagline:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 8, letterSpacing: 0.8 },

  // Card
  card: {
    backgroundColor: D.surface,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1, borderColor: D.border,
    elevation: 12,
    shadowColor: "rgba(0,0,0,0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1, shadowRadius: 24,
  },
  cardAccentBar: { height: 4 },
  cardBody:  { padding: 28 },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: D.ink, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft, marginBottom: 28 },

  // Fields
  field:     { marginBottom: 18 },
  fieldLbl:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: D.bg, borderRadius: 13, borderWidth: 1, borderColor: D.border,
    height: 52,
  },
  inputIcon: { width: 44, justifyContent: "center", alignItems: "center" },
  input:     { flex: 1, color: D.ink, fontFamily: "Inter_400Regular", fontSize: 15, paddingRight: 14 },
  eyeBtn:    { width: 44, height: 52, justifyContent: "center", alignItems: "center" },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: D.roseBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: D.rose + "30",
    marginBottom: 16,
  },
  errorTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.rose, flex: 1 },

  // Login button
  loginBtn:      { borderRadius: 14, overflow: "hidden", marginTop: 6 },
  loginBtnInner: {
    height: 54, flexDirection: "row",
    justifyContent: "center", alignItems: "center", gap: 10,
  },
  loginBtnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // Divider + hint
  divider: { height: 1, backgroundColor: D.border, marginVertical: 20 },
  hint:    { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  hintIcon:{ width: 22, height: 22, borderRadius: 6, backgroundColor: D.bg, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  hintTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: D.inkSoft },
});