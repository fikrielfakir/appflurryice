import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");

// Flurry Ice brand palette
const Brand = {
  navy:       "#1A237E",
  navyDark:   "#0D1257",
  navyDeep:   "#070C3D",
  blue:       "#283593",
  gold:       "#C8A84B",
  goldLight:  "#E8C86A",
  goldDark:   "#A07828",
  white:      "#FFFFFF",
  offWhite:   "rgba(255,255,255,0.85)",
  dim:        "rgba(255,255,255,0.45)",
  ghost:      "rgba(255,255,255,0.22)",
  inputBg:    "rgba(255,255,255,0.06)",
  inputBorder:"rgba(200,168,75,0.30)",
  inputFocus: "rgba(200,168,75,0.70)",
  error:      "#FF6B6B",
  errorBg:    "rgba(255,107,107,0.12)",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const { t } = useTranslation();

  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [focusedField, setFocusedField] = useState<"user" | "pass" | null>(null);

  // Entrance animations
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoY         = useRef(new Animated.Value(-30)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const cardY         = useRef(new Animated.Value(40)).current;
  const shimmer       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(logoY,       { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardY,       { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError(t("auth.pleaseFillCredentials"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = await login(username.trim(), password);
      if (!success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(t("auth.invalidCredentials"));
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={S.root}>
      {/* Deep navy gradient background */}
      <LinearGradient
        colors={[Brand.navyDeep, Brand.navyDark, Brand.navy]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle radial glow behind logo */}
      <View style={S.glowTop} pointerEvents="none" />
      <View style={S.glowBottom} pointerEvents="none" />

      {/* Gold ring decorations */}
      <View style={S.ringOuter} pointerEvents="none" />
      <View style={S.ringInner} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[S.kav, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
      >
        {/* ── Logo section ── */}
        <Animated.View style={[S.logoSection, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
          {/* Gold badge ring around logo */}
          <View style={S.logoBadge}>
            <LinearGradient
              colors={[Brand.goldDark, Brand.goldLight, Brand.gold, Brand.goldDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={S.logoBadgeRing}
            />
            <View style={S.logoImageWrap}>
              <Image
                source={require("../assets/flurry-logo.png")}
                style={S.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Shimmer tagline */}
          <Animated.Text style={[S.tagline, { opacity: shimmerOpacity }]}>
            {t("auth.tagline")}
          </Animated.Text>

          {/* Gold divider */}
          <LinearGradient
            colors={["transparent", Brand.gold, "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.dividerLine}
          />
        </Animated.View>

        {/* ── Login card ── */}
        <Animated.View style={[S.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
          {/* Gold top accent */}
          <LinearGradient
            colors={[Brand.goldDark, Brand.goldLight, Brand.goldDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.cardTopBar}
          />

          <View style={S.cardBody}>
            <Text style={S.cardTitle}>{t("auth.welcomeBack")}</Text>
            <Text style={S.cardSubtitle}>{t("auth.loginSubtitle")}</Text>

            {/* Username field */}
            <View style={S.field}>
              <Text style={S.fieldLabel}>{t("auth.username")}</Text>
              <View style={[
                S.inputRow,
                focusedField === "user" && S.inputRowFocused,
              ]}>
                <View style={S.iconWrap}>
                  <Feather name="user" size={15} color={focusedField === "user" ? Brand.goldLight : Brand.dim} />
                </View>
                <TextInput
                  style={S.input}
                  value={username}
                  onChangeText={(v) => { setUsername(v); setError(""); }}
                  placeholder={t("auth.usernamePlaceholder")}
                  placeholderTextColor={Brand.ghost}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("user")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={S.field}>
              <Text style={S.fieldLabel}>{t("auth.password")}</Text>
              <View style={[
                S.inputRow,
                focusedField === "pass" && S.inputRowFocused,
              ]}>
                <View style={S.iconWrap}>
                  <Feather name="lock" size={15} color={focusedField === "pass" ? Brand.goldLight : Brand.dim} />
                </View>
                <TextInput
                  style={S.input}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(""); }}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={Brand.ghost}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField("pass")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={15} color={Brand.dim} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error message */}
            {!!error && (
              <View style={S.errorBox}>
                <Feather name="alert-circle" size={13} color={Brand.error} />
                <Text style={S.errorText}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <TouchableOpacity
              style={[S.loginBtn, loading && { opacity: 0.75 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={[Brand.goldDark, Brand.goldLight, Brand.gold]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={S.loginBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color={Brand.navyDeep} size="small" />
                ) : (
                  <>
                    <Text style={S.loginBtnText}>{t("auth.loginButton")}</Text>
                    <Feather name="arrow-right" size={17} color={Brand.navyDeep} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom brand badge */}
            <View style={S.brandBadge}>
              <View style={S.brandDot} />
              <Text style={S.brandText}>FlurryIce POS System</Text>
              <View style={S.brandDot} />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_RADIUS = 22;

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navyDeep },

  // Glow effects
  glowTop: {
    position: "absolute",
    width: 420, height: 420,
    borderRadius: 210,
    backgroundColor: Brand.gold,
    opacity: 0.05,
    top: -120, alignSelf: "center",
  },
  glowBottom: {
    position: "absolute",
    width: 300, height: 300,
    borderRadius: 150,
    backgroundColor: Brand.navy,
    opacity: 0.4,
    bottom: -60, alignSelf: "center",
  },

  // Decorative rings
  ringOuter: {
    position: "absolute",
    width: 520, height: 520,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: "rgba(200,168,75,0.07)",
    top: -180, alignSelf: "center",
  },
  ringInner: {
    position: "absolute",
    width: 380, height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: "rgba(200,168,75,0.05)",
    top: -110, alignSelf: "center",
  },

  kav: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  // Logo section
  logoSection:  { alignItems: "center", marginBottom: 32 },
  logoBadge:    { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  logoBadgeRing:{
    ...StyleSheet.absoluteFillObject,
    borderRadius: 80,
    opacity: 0.25,
  },
  logoImageWrap:{
    width: 148, height: 148,
    borderRadius: 74,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(200,168,75,0.35)",
  },
  logoImage:    { width: 136, height: 136 },

  tagline:      {
    fontSize: 11,
    color: Brand.goldLight,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  dividerLine:  { height: 1, width: 140, borderRadius: 1 },

  // Card
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(200,168,75,0.18)",
  },
  cardTopBar:   { height: 3 },
  cardBody:     { padding: 28 },

  cardTitle:    {
    fontSize: 22,
    fontWeight: "700",
    color: Brand.white,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Brand.dim,
    marginBottom: 26,
    letterSpacing: 0.2,
  },

  // Fields
  field:     { marginBottom: 18 },
  fieldLabel:{
    fontSize: 11,
    color: Brand.goldLight,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 9,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.inputBg,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Brand.inputBorder,
    height: 52,
  },
  inputRowFocused: {
    borderColor: Brand.inputFocus,
    backgroundColor: "rgba(200,168,75,0.06)",
  },
  iconWrap:  { width: 44, justifyContent: "center", alignItems: "center" },
  input:     { flex: 1, color: Brand.white, fontSize: 15, paddingRight: 12 },
  eyeBtn:    { width: 44, height: 52, justifyContent: "center", alignItems: "center" },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Brand.errorBg,
    borderRadius: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: Brand.error, flex: 1 },

  // Login button
  loginBtn:         { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  loginBtnGradient: {
    height: 54,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loginBtnText: {
    color: Brand.navyDeep,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Brand badge
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
  },
  brandDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: Brand.goldDark },
  brandText: { fontSize: 11, color: "rgba(200,168,75,0.5)", letterSpacing: 1.5, textTransform: "uppercase" },
});
