import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp, Contact } from "@/context/AppContext";
import { Colors } from "@/constants";
import { AppHeader } from "@/components/common/AppHeader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

const TYPES = ["customer", "lead", "supplier"] as const;

// Per-type colors from the design system
function typeMeta(type: string): { color: string; bg: string; label: string } {
  if (type === "customer") return { color: D.heroAccent, bg: D.violetBg,  label: "Client"     };
  if (type === "lead")     return { color: D.amber,      bg: D.amberBg,   label: "Prospect"   };
  return                          { color: D.emerald,    bg: D.emeraldBg, label: "Fournisseur" };
}

// Avatar accent cycle
const AVATAR_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose, D.violet];

// ── Contact Card ──────────────────────────────────────────────────────────────
function ContactCard({
  contact, index, onDelete, onPress,
}: {
  contact: Contact; index: number; onDelete: () => void; onPress?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useTranslation();
  const meta         = typeMeta(contact.type);
  const avatarColor  = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials     = contact.name.slice(0, 2).toUpperCase();

  return (
    <>
      <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.82}>
        {/* Left accent strip */}
        <View style={[S.cardStrip, { backgroundColor: avatarColor }]} />

        <View style={S.cardInner}>
          {/* Avatar */}
          <View style={[S.avatar, { backgroundColor: avatarColor + "18" }]}>
            <Text style={[S.avatarTxt, { color: avatarColor }]}>{initials}</Text>
          </View>

          {/* Info */}
          <View style={S.cardBody}>
            <Text style={S.cardName} numberOfLines={1}>{contact.name}</Text>
            <View style={S.metaRow}>
              <Feather name="phone" size={10} color={D.inkSoft} />
              <Text style={S.metaTxt}>{contact.phone}</Text>
            </View>
            {contact.email ? (
              <View style={S.metaRow}>
                <Feather name="mail" size={10} color={D.inkSoft} />
                <Text style={S.metaTxt} numberOfLines={1}>{contact.email}</Text>
              </View>
            ) : null}
          </View>

          {/* Right: type badge + delete */}
          <View style={S.cardRight}>
            <View style={[S.typeBadge, { backgroundColor: meta.bg }]}>
              <View style={[S.typeDot, { backgroundColor: meta.color }]} />
              <Text style={[S.typeTxt, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <TouchableOpacity
              style={S.deleteBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowConfirm(true); }}
            >
              <Feather name="trash-2" size={13} color={D.rose} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      <ConfirmModal
        visible={showConfirm}
        title={t("contacts.deleteContact")}
        message={`${t("common.delete")} ${contact.name}?`}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        type="danger"
        icon="trash-2"
        onConfirm={() => { setShowConfirm(false); onDelete(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, addContact, deleteContact, setIsSidebarOpen, isSyncing, syncData, setContacts } = useApp();
  const { t } = useTranslation();
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [search, setSearch]                         = useState("");
  const [modalVisible, setModalVisible]             = useState(false);
  const [name, setName]                             = useState("");
  const [phone, setPhone]                           = useState("");
  const [email, setEmail]                           = useState("");
  const [type, setType]                             = useState<Contact["type"]>("customer");
  const [selectedContact, setSelectedContact]       = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal]       = useState(false);
  const [scanning, setScanning]                     = useState(false);
  const [permission, requestPermission]             = useCameraPermissions();
  const [showSyncSheet, setShowSyncSheet]           = useState(false);

  const startScanning = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Toast.show(t("auth.cameraPermissionRequired") || "Camera permission required", {
          duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose,
        });
        return;
      }
    }
    setScanning(true);
  };

  const handleQRScan = async ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const qrData: { id: number; name: string; phone: string; email: string | null; address: string | null; balance: number; type: string; refrigerators: string }[] = JSON.parse(data);
      if (!Array.isArray(qrData)) {
        Toast.show(t("contacts.invalidQRCode") || "Format QR invalide", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
        return;
      }
      let addedCount = 0;
      const newContacts: Contact[] = [];
      qrData.forEach((item) => {
        const existing = contacts.find((c) => String(c.id) === String(item.id) || c.phone === item.phone);
        if (!existing) {
          addedCount++;
          newContacts.push({
            id: String(item.id),
            name: item.name || item.phone || "Unknown",
            phone: item.phone || "",
            email: item.email || undefined,
            address: item.address || undefined,
            type: (item.type as Contact["type"]) || "customer",
            date: new Date().toISOString(),
            balance: item.balance || 0,
            refrigerators: item.refrigerators || undefined,
          });
        }
      });
      if (addedCount > 0) {
        const all = [...contacts, ...newContacts];
        setContacts(all);
        await AsyncStorage.setItem("@bizpos_contacts", JSON.stringify(all));
        Toast.show(`${addedCount} ${t("contacts.added") || "contacts ajoutés"}`, { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Toast.show(t("contacts.noNewContacts") || "Aucun nouveau contact", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.amber });
      }
    } catch {
      Toast.show(t("contacts.invalidQRCode") || "QR invalide", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
    }
  };

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      return matchSearch && c.type === "customer";
    });
  }, [contacts, search]);

  function openDetailModal(contact: Contact) {
    setSelectedContact(contact);
    setShowDetailModal(true);
  }

  function openAddModal() {
    setName(""); setPhone(""); setEmail(""); setType("customer");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  }

  function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Toast.show(t("contacts.pleaseFillNamePhone"), { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
      return;
    }
    addContact({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, type });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    Toast.show(t("contacts.contactAdded"), { duration: Toast.durations.SHORT });
  }

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t("contacts.title")}
          dark
          showMenu
          onMenuPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsSidebarOpen(true); }}
          rightActions={
            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Sync */}
              <TouchableOpacity
                style={S.hBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSyncSheet(true); }}
                disabled={isSyncing}
                activeOpacity={0.75}
              >
                {isSyncing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="refresh-cw" size={17} color="rgba(255,255,255,0.9)" />
                }
              </TouchableOpacity>
            </View>
          }
        />

        {/* Count + search */}
        <View style={S.heroBody}>
          <Text style={S.heroCount}>{contacts.length} {t("contacts.title").toLowerCase()}</Text>
          <View style={S.searchWrap}>
            <Feather name="search" size={14} color={D.inkSoft} style={{ marginRight: 8 }} />
            <TextInput
              style={S.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t("contacts.searchContacts")}
              placeholderTextColor={D.inkGhost}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={14} color={D.inkSoft} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Contact list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + bottomInset }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item, index }) => (
          <ContactCard
            contact={item}
            index={index}
            onDelete={() => deleteContact(item.id)}
            onPress={() => openDetailModal(item)}
          />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <View style={S.emptyIcon}>
              <Feather name="users" size={28} color={D.inkSoft} />
            </View>
            <Text style={S.emptyTitle}>{search ? t("contacts.noResults") : t("contacts.noContacts")}</Text>
            <Text style={S.emptyDesc}>
              {search ? "Essayez un autre terme" : "Ajoutez ou synchronisez des contacts"}
            </Text>
          </View>
        }
      />

      {/* ── Add Contact Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[S.fullSheet, { backgroundColor: D.surface }]}>
          <View style={S.handle} />
          <View style={S.sheetHeaderRow}>
            <Text style={S.sheetTitle}>{t("contacts.newContact")}</Text>
            <TouchableOpacity style={S.sheetClose} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={16} color={D.inkSoft} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={S.sheetBody} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <View style={S.field}>
                <Text style={S.fieldLbl}>{t("contacts.fullName")} *</Text>
                <TextInput style={S.fieldInput} value={name} onChangeText={setName}
                  placeholder={t("contacts.fullNamePlaceholder")} placeholderTextColor={D.inkGhost} />
              </View>
              {/* Phone */}
              <View style={S.field}>
                <Text style={S.fieldLbl}>{t("contacts.phone")} *</Text>
                <TextInput style={S.fieldInput} value={phone} onChangeText={setPhone}
                  placeholder={t("contacts.phonePlaceholder")} placeholderTextColor={D.inkGhost} keyboardType="phone-pad" />
              </View>
              {/* Email */}
              <View style={S.field}>
                <Text style={S.fieldLbl}>{t("contacts.email")}</Text>
                <TextInput style={S.fieldInput} value={email} onChangeText={setEmail}
                  placeholder={t("contacts.emailPlaceholder")} placeholderTextColor={D.inkGhost}
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
              {/* Type */}
              <View style={S.field}>
                <Text style={S.fieldLbl}>{t("contacts.type")}</Text>
                <View style={S.typeRow}>
                  {TYPES.map((tp) => {
                    const m = typeMeta(tp);
                    const active = type === tp;
                    return (
                      <TouchableOpacity
                        key={tp}
                        style={[S.typeBtn, active && { backgroundColor: m.bg, borderColor: m.color }]}
                        onPress={() => { Haptics.selectionAsync(); setType(tp); }}
                      >
                        {active && <View style={[S.typeDotInline, { backgroundColor: m.color }]} />}
                        <Text style={[S.typeBtnTxt, active && { color: m.color }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {/* Save */}
              <TouchableOpacity style={S.saveBtn} onPress={handleAdd}>
                <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.saveBtnInner}>
                  <Feather name="user-plus" size={17} color="#fff" />
                  <Text style={S.saveBtnTxt}>{t("contacts.addContact")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Detail Sheet ── */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <Pressable style={S.overlay} onPress={() => setShowDetailModal(false)}>
          <Pressable style={S.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={S.handle} />
            {selectedContact && (() => {
              const meta  = typeMeta(selectedContact.type);
              const color = AVATAR_COLORS[contacts.indexOf(selectedContact) % AVATAR_COLORS.length];
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Avatar hero */}
                  <View style={S.detailHero}>
                    <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
                    <View style={[S.detailAvatar, { backgroundColor: color + "28" }]}>
                      <Text style={[S.detailAvatarTxt, { color }]}>
                        {selectedContact.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={S.detailName}>{selectedContact.name}</Text>
                    <View style={[S.detailTypeBadge, { backgroundColor: meta.bg }]}>
                      <View style={[S.typeDot, { backgroundColor: meta.color }]} />
                      <Text style={[S.detailTypeTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {/* Info card */}
                  <View style={S.infoCard}>
                    {[
                      { icon: "phone",   label: t("contacts.phone"),   value: selectedContact.phone },
                      ...(selectedContact.email   ? [{ icon: "mail",    label: t("contacts.email"),   value: selectedContact.email   }] : []),
                      ...(selectedContact.address ? [{ icon: "map-pin", label: t("contacts.address"), value: selectedContact.address }] : []),
                    ].map((row, i) => (
                      <View key={i} style={[S.infoRow, i > 0 && S.infoRowBorder]}>
                        <View style={[S.infoIcon, { backgroundColor: D.violetBg }]}>
                          <Feather name={row.icon as any} size={13} color={D.heroAccent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.infoLbl}>{row.label}</Text>
                          <Text style={S.infoVal}>{row.value}</Text>
                        </View>
                      </View>
                    ))}
                    {/* Balance */}
                    <View style={[S.infoRow, S.infoRowBorder]}>
                      <View style={[S.infoIcon, { backgroundColor: D.emeraldBg }]}>
                        <Feather name="trending-up" size={13} color={D.emerald} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.infoLbl}>{t("contacts.balance")}</Text>
                        <Text style={[S.infoVal, { color: D.emerald }]}>
                          {selectedContact.balance?.toFixed(2) || "0.00"} MAD
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Refrigerators */}
                  {selectedContact.refrigerators && selectedContact.refrigerators !== "[]" && (() => {
                    try {
                      let fridges: any[] = [];
                      try { fridges = JSON.parse(selectedContact.refrigerators!); }
                      catch { fridges = JSON.parse(selectedContact.refrigerators!.replace(/\\"/g, '"')); }
                      if (!Array.isArray(fridges) || fridges.length === 0 || !fridges[0]?.marque) return null;
                      return (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={S.sectionLbl}>{t("contacts.refrigerators")} ({fridges.length})</Text>
                          <View style={S.fridgesCard}>
                            {fridges.map((fridge: any, i: number) => (
                              <View key={i} style={[S.fridgeRow, i > 0 && S.infoRowBorder]}>
                                <View style={[S.infoIcon, { backgroundColor: D.blueBg }]}>
                                  <Feather name="box" size={13} color={D.blue} />
                                </View>
                                <Text style={[S.infoVal, { flex: 1 }]}>
                                  {fridge.marque || "N/A"} — {fridge.reference || "N/A"}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    } catch { return null; }
                  })()}

                  <TouchableOpacity style={S.closeBtn} onPress={() => setShowDetailModal(false)}>
                    <Text style={S.closeBtnTxt}>{t("contacts.close") || "Fermer"}</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Sync sheet ── */}
      <Modal visible={showSyncSheet} transparent animationType="slide" onRequestClose={() => setShowSyncSheet(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSyncSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
          </Pressable>
          <View style={S.syncSheet}>
            <View style={S.handle} />
            <Text style={[S.sheetTitle, { marginBottom: 20 }]}>
              {t("contacts.syncOptions") || "Options de sync"}
            </Text>
            {[
              { icon: "cloud",    color: D.blue,   bg: D.blueBg,    label: t("contacts.syncSupabase") || "Sync depuis le serveur",  desc: t("contacts.syncSupabaseDesc") || "Contacts depuis Supabase", onPress: () => { setShowSyncSheet(false); syncData(); }, disabled: isSyncing },
              { icon: "maximize", color: D.emerald, bg: D.emeraldBg, label: t("contacts.syncQRCode") || "Scanner QR Contacts",       desc: t("contacts.syncQRCodeDesc") || "Importer via QR code",       onPress: () => { setShowSyncSheet(false); startScanning(); }, disabled: false },
            ].map((opt, i) => (
              <TouchableOpacity key={i} style={S.syncOpt} onPress={opt.onPress} disabled={opt.disabled}>
                <View style={[S.syncOptIcon, { backgroundColor: opt.bg }]}>
                  <Feather name={opt.icon as any} size={20} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.syncOptLabel}>{opt.label}</Text>
                  <Text style={S.syncOptDesc}>{opt.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={D.inkGhost} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Camera ── */}
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
            <Text style={S.camTxt}>{t("contacts.scanQRCode") || "Scanner le QR des contacts"}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60 },
  blob2: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 10, left: -30 },

  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  heroBody: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16 },
  heroCount: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, height: 42,
  },
  searchInput: { flex: 1, color: D.ink, fontSize: 14, fontFamily: "Inter_400Regular" },

  // Contact card
  card: {
    flexDirection: "row",
    backgroundColor: D.card,
    borderRadius: 16, borderWidth: 1, borderColor: D.border,
    overflow: "hidden",
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },

  avatar:    { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarTxt: { fontSize: 16, fontFamily: "Inter_700Bold" },

  cardBody:  { flex: 1, gap: 3 },
  cardName:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },
  metaRow:   { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:   { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, flex: 1 },

  cardRight: { alignItems: "flex-end", gap: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeDot:   { width: 5, height: 5, borderRadius: 3 },
  typeTxt:   { fontSize: 10, fontFamily: "Inter_700Bold" },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: D.roseBg, justifyContent: "center", alignItems: "center",
  },

  // Empty
  empty:      { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: D.surface, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  emptyDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft },

  // FAB
  fab:      { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, overflow: "hidden", elevation: 8, shadowColor: D.heroAccent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  fabInner: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Shared sheet base
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:   { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 36, maxHeight: "88%" },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: "center", marginBottom: 18 },

  sheetHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle:     { fontSize: 18, fontFamily: "Inter_700Bold", color: D.ink },
  sheetClose:     { width: 30, height: 30, borderRadius: 15, backgroundColor: D.bg, justifyContent: "center", alignItems: "center" },

  // Full-screen sheet (add contact)
  fullSheet: { flex: 1 },
  sheetBody: { padding: 20, gap: 16 },

  // Form fields
  field:      { gap: 6 },
  fieldLbl:   { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.6 },
  fieldInput: {
    backgroundColor: D.bg, borderRadius: 12, borderWidth: 1, borderColor: D.border,
    padding: 14, color: D.ink, fontFamily: "Inter_400Regular", fontSize: 15,
  },

  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 10, borderRadius: 11,
    backgroundColor: D.bg, borderWidth: 1, borderColor: D.border,
  },
  typeDotInline: { width: 6, height: 6, borderRadius: 3 },
  typeBtnTxt:    { fontSize: 12, fontFamily: "Inter_500Medium", color: D.inkSoft },

  saveBtn:      { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52 },
  saveBtnTxt:   { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Detail hero
  detailHero:       { borderRadius: 18, overflow: "hidden", alignItems: "center", paddingVertical: 28, marginBottom: 16 },
  detailAvatar:     { width: 66, height: 66, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  detailAvatarTxt:  { fontSize: 24, fontFamily: "Inter_700Bold" },
  detailName:       { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 8 },
  detailTypeBadge:  { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  detailTypeTxt:    { fontSize: 11, fontFamily: "Inter_700Bold" },

  infoCard:      { backgroundColor: D.bg, borderRadius: 14, borderWidth: 1, borderColor: D.border, marginBottom: 16, overflow: "hidden" },
  infoRow:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: D.border },
  infoIcon:      { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  infoLbl:       { fontSize: 10, fontFamily: "Inter_400Regular", color: D.inkSoft, marginBottom: 2 },
  infoVal:       { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.ink },

  sectionLbl:  { fontSize: 10, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },
  fridgesCard: { backgroundColor: D.bg, borderRadius: 14, borderWidth: 1, borderColor: D.border, overflow: "hidden" },
  fridgeRow:   { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },

  closeBtn:    { backgroundColor: D.bg, borderRadius: 14, height: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border, marginTop: 4 },
  closeBtnTxt: { color: D.inkSoft, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Sync sheet
  syncSheet:    { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: D.border },
  syncOpt:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  syncOptIcon:  { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  syncOptLabel: { color: D.ink, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  syncOptDesc:  { color: D.inkSoft, fontSize: 12 },

  // Camera
  closeCam:   { position: "absolute", top: 50, right: 20, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" },
  camOverlay: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  camTxt:     { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22 },
});