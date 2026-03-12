import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useApp, Contact } from "@/context/AppContext";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const AVATAR_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose, D.violet];

export default function CustomerScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ discount: string; subtotal: string; total: string }>();
  const { contacts, addContact } = useApp();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [verified, setVerified] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const customers = contacts.filter((c) => c.type === "customer" || c.type === "lead");

  const avatarColor = selectedContact
    ? AVATAR_COLORS[customers.indexOf(selectedContact) % AVATAR_COLORS.length]
    : D.heroAccent;

  function selectCustomer(contact: Contact) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedContact(contact);
    setVerified(true);
  }

  function handleWalkIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/pos/payment",
      params: { ...params, customerName: t("pos.walkInCustomer"), customerPhone: "" },
    });
  }

  function handleProceed() {
    if (!selectedContact) return;
    router.push({
      pathname: "/pos/payment",
      params: { ...params, customerName: selectedContact.name, customerPhone: selectedContact.phone },
    });
  }

  function handleAddCustomer() {
    if (!newName.trim() || !newPhone.trim()) {
      Toast.show(t("customer.pleaseEnterNamePhone"), {
        duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose,
      });
      return;
    }
    addContact({ name: newName.trim(), phone: newPhone.trim(), type: "customer" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddModalVisible(false);
    setNewName(""); setNewPhone("");
    Toast.show(t("customer.customerAdded"), { duration: Toast.durations.SHORT });
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    
    const customer = customers.find((c) => c.id === data);
    
    if (customer) {
      selectCustomer(customer);
      Toast.show(`${customer.name}`, { duration: Toast.durations.SHORT });
    } else {
      Toast.show(t("customer.noCustomersFound"), { duration: Toast.durations.SHORT, backgroundColor: D.rose });
    }
  };

  if (!permission) {
    return <View style={[S.screen, { backgroundColor: D.bg }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[S.screen, { backgroundColor: D.bg, justifyContent: "center", alignItems: "center", padding: 40 }]}>
        <View style={S.permIcon}>
          <Feather name="camera-off" size={30} color={D.inkSoft} />
        </View>
        <Text style={S.permTitle}>Camera required</Text>
        <Text style={S.permDesc}>Allow camera access to scan QR codes.</Text>
        <TouchableOpacity style={S.permBtn} onPress={requestPermission}>
          <Text style={S.permBtnTxt}>Allow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        {/* Nav row */}
        <View style={[S.navRow, { paddingTop: topInset + 10 }]}>
          <TouchableOpacity style={S.hBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={S.navTitle}>{t("customer.title")}</Text>
          <View style={S.hBtn} />
        </View>

        {/* Hero sub */}
        <View style={S.heroCenterRow}>
          <View style={S.heroIconWrap}>
            <Feather name="users" size={20} color={D.heroAccent} />
          </View>
          <Text style={S.heroSub}>{t("customer.selectCustomer")}</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={S.body}>

        {/* Customer info */}
        <View style={S.card}>
          <View style={S.cardTitleRow}>
            <Text style={S.cardTitle}>{t("customer.customerInfo")}</Text>
            <Feather name="user" size={14} color={D.inkSoft} />
          </View>

          {verified && selectedContact ? (
            /* Verified state */
            <View style={S.verifiedBox}>
              <View style={[S.verifiedAvatar, { backgroundColor: avatarColor + "18" }]}>
                <Text style={[S.verifiedInitial, { color: avatarColor }]}>
                  {selectedContact.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.verifiedName}>{selectedContact.name}</Text>
                <Text style={S.verifiedPhone}>{selectedContact.phone}</Text>
                {(selectedContact as any).totalPurchased ? (
                  <Text style={S.verifiedHistory}>
                    {t("pos.total")}: MAD {fmt((selectedContact as any).totalPurchased)}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={S.verifiedClear}
                onPress={() => { setSelectedContact(null); setVerified(false); }}
              >
                <Feather name="x" size={14} color={D.inkSoft} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={S.noSelectionText}>Scan QR code to select customer</Text>
          )}
        </View>

        {/* Verified confirmation banner */}
        {verified && selectedContact && (
          <View style={S.verifiedBanner}>
            <View style={[S.verifiedBannerIcon, { backgroundColor: D.emeraldBg }]}>
              <Feather name="check-circle" size={15} color={D.emerald} />
            </View>
            <Text style={S.verifiedBannerTxt}>{t("customer.customerVerified")}</Text>
          </View>
        )}

        {/* QR section */}
        {!verified && (
          <View style={S.card}>
            <View style={S.qrBlock}>
              <View style={[S.qrIconBox, { backgroundColor: D.violetBg }]}>
                <Feather name="maximize" size={28} color={D.heroAccent} />
              </View>
              <Text style={S.qrTitle}>{t("customer.quickSelection")}</Text>
              <Text style={S.qrSub}>Scan customer QR code</Text>
              <TouchableOpacity style={S.qrBtn} onPress={() => setScanning(true)} activeOpacity={0.85}>
                <LinearGradient colors={[D.heroA, D.heroAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.qrBtnInner}>
                  <Feather name="camera" size={15} color="#fff" />
                  <Text style={S.qrBtnTxt}>{t("customer.scanQrCode")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Bottom actions ── */}
      <View style={[S.bottomActions, { paddingBottom: insets.bottom + 12 }]}>

        <View style={S.actionRow}>
          {/* Walk-in */}

          {/* Proceed (only when verified) */}
          {verified && (
            <TouchableOpacity style={S.proceedBtn} onPress={handleProceed} activeOpacity={0.85}>
              <LinearGradient colors={[D.heroA, D.heroAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.proceedBtnInner}>
                <Feather name="credit-card" size={15} color="#fff" />
                <Text style={S.proceedBtnTxt}>{t("customer.payment")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Add Customer Modal ── */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeaderRow}>
              <Text style={S.sheetTitle}>{t("customer.newCustomer")}</Text>
              <TouchableOpacity style={S.sheetClose} onPress={() => setAddModalVisible(false)}>
                <Feather name="x" size={16} color={D.inkSoft} />
              </TouchableOpacity>
            </View>

            <View style={S.field}>
              <Text style={S.fieldLbl}>{t("customer.fullName")} *</Text>
              <View style={S.inputWrap}>
                <View style={S.inputIcon}><Feather name="user" size={14} color={D.inkSoft} /></View>
                <TextInput
                  style={S.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={t("customer.fullName")}
                  placeholderTextColor={D.inkGhost}
                />
              </View>
            </View>

            <View style={S.field}>
              <Text style={S.fieldLbl}>{t("customer.phoneNumber")} *</Text>
              <View style={S.inputWrap}>
                <View style={S.inputIcon}><Feather name="phone" size={14} color={D.inkSoft} /></View>
                <TextInput
                  style={S.input}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder={t("customer.phoneNumber")}
                  placeholderTextColor={D.inkGhost}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={S.modalBtnRow}>
              <TouchableOpacity style={S.modalCancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={S.modalCancelTxt}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalSaveBtn} onPress={handleAddCustomer}>
                <LinearGradient colors={[D.heroA, D.heroAccent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.modalSaveBtnInner}>
                  <Text style={S.modalSaveTxt}>{t("common.add")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Camera scanner ── */}
      {scanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          >
            <View style={S.camOverlay}>
              <View style={{ flex: 1 }} />
              <View style={S.camMiddle}>
                <View style={{ flex: 1 }} />
                <View style={S.camFocus} />
                <View style={{ flex: 1 }} />
              </View>
              <View style={[{ flex: 1 }, S.camBottom]}>
                <Text style={S.camHint}>Scan customer QR code</Text>
                <TouchableOpacity style={S.camCancel} onPress={() => setScanning(false)}>
                  <Feather name="x" size={18} color="#fff" />
                  <Text style={S.camCancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroAccent, opacity: 0.1, top: -50, right: -50 },
  blob2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 0, left: -20 },

  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: -0.3 },
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  heroCenterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 16 },
  heroIconWrap:  { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  heroSub:       { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)" },

  // Body
  body: { flex: 1, padding: 14, gap: 12 },

  // Card
  card: {
    backgroundColor: D.card,
    borderRadius: 18, borderWidth: 1, borderColor: D.border,
    padding: 16, gap: 12,
    elevation: 1, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4,
  },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle:    { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 },

  noSelectionText: { fontSize: 14, color: D.inkSoft, textAlign: "center", paddingVertical: 10 },

  // Verified box
  verifiedBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: D.emeraldBg, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: D.emerald + "40",
  },
  verifiedAvatar:  { width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  verifiedInitial: { fontSize: 15, fontFamily: "Inter_700Bold" },
  verifiedName:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  verifiedPhone:   { fontSize: 12, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 1 },
  verifiedHistory: { fontSize: 11, fontFamily: "Inter_500Medium", color: D.emerald, marginTop: 2 },
  verifiedClear:   { width: 28, height: 28, borderRadius: 8, backgroundColor: D.surface, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },

  // Verified banner
  verifiedBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: D.emeraldBg, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: D.emerald + "40",
  },
  verifiedBannerIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  verifiedBannerTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.emerald },

  // QR block
  qrBlock:   { alignItems: "center", gap: 8 },
  qrIconBox: { width: 68, height: 68, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  qrTitle:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  qrSub:     { fontSize: 12, fontFamily: "Inter_400Regular", color: D.inkSoft, textAlign: "center" },
  qrBtn:     { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  qrBtnInner:{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 11 },
  qrBtnTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Bottom actions
  bottomActions: {
    backgroundColor: D.surface, paddingHorizontal: 16, paddingTop: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: D.border,
    elevation: 4, shadowColor: D.shadow,
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 1, shadowRadius: 6,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: D.violetBg,
    borderWidth: 1, borderColor: D.heroAccent + "40",
  },
  addBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.heroAccent },

  actionRow:  { flexDirection: "row", gap: 10 },
  walkInBtn:  {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 13,
    backgroundColor: D.bg, borderWidth: 1, borderColor: D.border,
  },
  walkInTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.inkSoft },

  proceedBtn:      { flex: 1, borderRadius: 13, overflow: "hidden" },
  proceedBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48 },
  proceedBtnTxt:   { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Sheet modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:   { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 36 },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: "center", marginBottom: 18 },
  sheetHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: D.ink },
  sheetClose:     { width: 30, height: 30, borderRadius: 15, backgroundColor: D.bg, justifyContent: "center", alignItems: "center" },

  field:    { marginBottom: 14 },
  fieldLbl: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  inputWrap:{ flexDirection: "row", alignItems: "center", backgroundColor: D.bg, borderRadius: 12, borderWidth: 1, borderColor: D.border, height: 48 },
  inputIcon:{ width: 40, justifyContent: "center", alignItems: "center" },
  input:    { flex: 1, color: D.ink, fontFamily: "Inter_400Regular", fontSize: 15, paddingRight: 12 },

  modalBtnRow:     { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn:  { flex: 1, height: 48, borderRadius: 12, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, justifyContent: "center", alignItems: "center" },
  modalCancelTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.inkSoft },
  modalSaveBtn:    { flex: 1, borderRadius: 12, overflow: "hidden" },
  modalSaveBtnInner: { height: 48, justifyContent: "center", alignItems: "center" },
  modalSaveTxt:    { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Camera
  camOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  camMiddle:  { flexDirection: "row", height: 280 },
  camFocus:   { width: 280, height: 280, borderWidth: 2, borderColor: D.heroAccent, borderRadius: 18 },
  camBottom:  { justifyContent: "flex-end", alignItems: "center", paddingBottom: 100, gap: 16 },
  camHint:    { color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_500Medium" },
  camCancel:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  camCancelTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Permission
  permIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: D.bg, justifyContent: "center", alignItems: "center", marginBottom: 18, borderWidth: 1, borderColor: D.border },
  permTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: D.ink, marginBottom: 8 },
  permDesc:  { fontSize: 14, fontFamily: "Inter_400Regular", color: D.inkSoft, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  permBtn:   { borderRadius: 14, overflow: "hidden" },
  permBtnTxt:{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
