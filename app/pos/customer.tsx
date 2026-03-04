import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, FlatList, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useApp, Contact } from "@/context/AppContext";
import { Colors as POS } from "@/constants";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

import Toast from 'react-native-root-toast';

export default function CustomerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ discount: string; subtotal: string; total: string }>();
  const { contacts, addContact } = useApp();

  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [verified, setVerified] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const customers = useMemo(() =>
    contacts.filter(c => c.type === "customer" || c.type === "lead"),
    [contacts]
  );

  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ),
    [customers, search]
  );

  function selectCustomer(contact: Contact) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedContact(contact);
    setVerified(true);
  }

  function handleWalkIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/pos/payment",
      params: {
        ...params,
        customerName: "Walk-in Customer",
        customerPhone: "",
      },
    });
  }

  function handleProceed() {
    if (!selectedContact) return;
    router.push({
      pathname: "/pos/payment",
      params: {
        ...params,
        customerName: selectedContact.name,
        customerPhone: selectedContact.phone,
      },
    });
  }

  function handleAddCustomer() {
    if (!newName.trim() || !newPhone.trim()) {
      Toast.show("Please enter name and phone.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: POS.danger,
      });
      return;
    }
    addContact({ name: newName.trim(), phone: newPhone.trim(), type: "customer" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddModalVisible(false);
    setNewName(""); setNewPhone("");
    Toast.show("Client ajouté", { duration: Toast.durations.SHORT });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBlock, { paddingTop: topInset }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.heroBlock}>
          <Feather name="users" size={28} color="#fff" />
          <Text style={styles.heroText}>Select Customer</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Info</Text>
            <Feather name="user" size={16} color={POS.textSecondary} />
          </View>

          {verified && selectedContact ? (
            <View style={styles.verifiedBox}>
              <View style={styles.verifiedLeft}>
                <View style={styles.verifiedAvatar}>
                  <Text style={styles.verifiedInitial}>
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.verifiedName}>{selectedContact.name}</Text>
                  <Text style={styles.verifiedPhone}>{selectedContact.phone}</Text>
                  {selectedContact.totalPurchased ? (
                    <Text style={styles.verifiedHistory}>
                      Total: MAD {fmt(selectedContact.totalPurchased)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => { setSelectedContact(null); setVerified(false); }}>
                <Feather name="x" size={18} color={POS.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchRow}>
              <Feather name="lock" size={16} color={POS.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search customer..."
                placeholderTextColor={POS.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={16} color={POS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {!verified && search.length > 0 && (
          <View style={styles.searchResults}>
            {filtered.length === 0 ? (
              <Text style={styles.noResults}>No customers found</Text>
            ) : (
              filtered.slice(0, 5).map(c => (
                <TouchableOpacity key={c.id} style={styles.resultItem} onPress={() => selectCustomer(c)}>
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultInitial}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{c.name}</Text>
                    <Text style={styles.resultPhone}>{c.phone}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={POS.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {!verified && (
          <View style={styles.section}>
            <View style={styles.qrBlock}>
              <View style={styles.qrIconBox}>
                <Feather name="maximize" size={36} color={POS.primary} />
              </View>
              <Text style={styles.qrTitle}>Quick Customer Selection</Text>
              <Text style={styles.qrSub}>Scan QR code for instant customer identification</Text>
              <TouchableOpacity
                style={styles.qrBtn}
                onPress={() => Alert.alert("QR Scanner", "Camera-based QR scanning available on physical devices.")}
              >
                <Feather name="camera" size={16} color="#fff" />
                <Text style={styles.qrBtnText}>Scan QR Code</Text>
              </TouchableOpacity>
            </View>

            {!selectedContact && (
              <View style={styles.warningBox}>
                <Feather name="alert-triangle" size={14} color={POS.warning} />
                <Text style={styles.warningText}>Please select a customer to proceed</Text>
              </View>
            )}
          </View>
        )}

        {verified && selectedContact && (
          <View style={styles.verifiedConfirm}>
            <Feather name="check-circle" size={16} color={POS.success} />
            <Text style={styles.verifiedConfirmText}>Customer Verified</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.addCustomerBtn} onPress={() => setAddModalVisible(true)}>
          <Feather name="user-plus" size={16} color={POS.primary} />
          <Text style={styles.addCustomerText}>Add Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.walkInBtn} onPress={handleWalkIn}>
          <Feather name="shopping-bag" size={16} color="#fff" />
          <Text style={styles.walkInText}>Walk-in (Skip)</Text>
        </TouchableOpacity>

        {verified && (
          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
            <Feather name="credit-card" size={16} color="#fff" />
            <Text style={styles.proceedText}>Payment</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Customer</Text>
            <TextInput style={styles.modalInput} value={newName} onChangeText={setNewName}
              placeholder="Full Name" placeholderTextColor={POS.textMuted} />
            <TextInput style={styles.modalInput} value={newPhone} onChangeText={setNewPhone}
              placeholder="Phone Number" placeholderTextColor={POS.textMuted} keyboardType="phone-pad" />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddCustomer}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: POS.background },
  headerBlock: { backgroundColor: POS.primary, paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff" },
  heroBlock: { alignItems: "center", gap: 8, paddingTop: 8 },
  heroText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  body: { flex: 1, padding: 16, gap: 12 },
  section: { backgroundColor: POS.card, borderRadius: 16, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.text },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: POS.background, borderRadius: 10,
    paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: POS.border,
  },
  searchInput: { flex: 1, color: POS.text, fontFamily: "Inter_400Regular", fontSize: 14 },
  searchResults: { backgroundColor: POS.card, borderRadius: 14, overflow: "hidden" },
  noResults: { padding: 16, textAlign: "center", color: POS.textSecondary, fontFamily: "Inter_400Regular" },
  resultItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: POS.border },
  resultAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: POS.primaryBg, justifyContent: "center", alignItems: "center" },
  resultInitial: { fontSize: 15, fontFamily: "Inter_700Bold", color: POS.primary },
  resultName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.text },
  resultPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  verifiedBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: POS.successBg, borderRadius: 10, padding: 12 },
  verifiedLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  verifiedAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: POS.success + "30", justifyContent: "center", alignItems: "center" },
  verifiedInitial: { fontSize: 16, fontFamily: "Inter_700Bold", color: POS.success },
  verifiedName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.text },
  verifiedPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary },
  verifiedHistory: { fontSize: 11, fontFamily: "Inter_500Medium", color: POS.success, marginTop: 2 },
  verifiedConfirm: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: POS.successBg, borderRadius: 12, padding: 14, justifyContent: "center" },
  verifiedConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.success },
  qrBlock: { alignItems: "center", gap: 8 },
  qrIconBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: POS.primaryBg, justifyContent: "center", alignItems: "center" },
  qrTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: POS.text },
  qrSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.textSecondary, textAlign: "center" },
  qrBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: POS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  qrBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  warningBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF3E0", borderRadius: 8, padding: 10 },
  warningText: { fontSize: 12, fontFamily: "Inter_400Regular", color: POS.warning, flex: 1 },
  bottomActions: { backgroundColor: POS.card, paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: POS.border },
  addCustomerBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: POS.primary, backgroundColor: POS.primaryBg },
  addCustomerText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.primary },
  walkInBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: POS.textSecondary },
  walkInText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  proceedBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 14, borderRadius: 12, backgroundColor: POS.primary },
  proceedText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: POS.text },
  modalInput: { backgroundColor: POS.background, borderRadius: 10, borderWidth: 1, borderColor: POS.border, padding: 14, color: POS.text, fontFamily: "Inter_400Regular", fontSize: 15 },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: POS.background, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: POS.textSecondary },
  modalSave: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: POS.primary, alignItems: "center" },
  modalSaveText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
