import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, Alert, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Contact } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

const TYPES = ["customer", "lead", "supplier"] as const;

function typeColor(t: string) {
  if (t === "customer") return C.primary;
  if (t === "lead") return C.warning;
  return C.success;
}

function typeLabel(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function ContactCard({ contact, onDelete }: { contact: Contact; onDelete: () => void }) {
  const col = typeColor(contact.type);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: col + "20" }]}>
        <Text style={[styles.avatarText, { color: col }]}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{contact.name}</Text>
        <View style={styles.row}>
          <Feather name="phone" size={11} color={C.textMuted} />
          <Text style={styles.phone}>{contact.phone}</Text>
        </View>
        {contact.email ? (
          <View style={styles.row}>
            <Feather name="mail" size={11} color={C.textMuted} />
            <Text style={styles.email} numberOfLines={1}>{contact.email}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.right}>
        <View style={[styles.typeBadge, { backgroundColor: col + "20" }]}>
          <Text style={[styles.typeText, { color: col }]}>{typeLabel(contact.type)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Delete Contact", `Remove ${contact.name}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
          style={styles.deleteBtn}
        >
          <Feather name="trash-2" size={14} color={C.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

import Toast from 'react-native-root-toast';

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, addContact, deleteContact } = useApp();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<Contact["type"]>("customer");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchType = filterType === "all" || c.type === filterType;
      return matchSearch && matchType;
    });
  }, [contacts, search, filterType]);

  function openModal() {
    setName(""); setPhone(""); setEmail(""); setType("customer");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVisible(true);
  }

  function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      Toast.show("Please fill name and phone number.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: C.danger,
      });
      return;
    }
    addContact({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, type });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    Toast.show("Contact ajouté", { duration: Toast.durations.SHORT });
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#0A1628", "#0E1C3F", C.background]} style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <Text style={styles.headerSub}>{contacts.length} contacts</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={C.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts..."
              placeholderTextColor={C.textMuted}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {["all", ...TYPES].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, filterType === t && styles.filterChipActive]}
              onPress={() => { Haptics.selectionAsync(); setFilterType(t); }}
            >
              <Text style={[styles.filterText, filterType === t && styles.filterTextActive]}>
                {t === "all" ? "All" : typeLabel(t)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 + bottomInset }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ContactCard contact={item} onDelete={() => deleteContact(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={C.textMuted} />
            <Text style={styles.emptyText}>{search ? "No results found" : "No contacts yet"}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <TouchableOpacity style={[styles.fab, { bottom: 90 + bottomInset }]} onPress={openModal}>
        <LinearGradient colors={["#2952C4", "#1A3C8F"]} style={styles.fabGradient}>
          <Feather name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Contact</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput style={styles.fieldInput} value={name} onChangeText={setName}
                  placeholder="Enter full name" placeholderTextColor={C.textMuted} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Phone *</Text>
                <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone}
                  placeholder="+1 555-0000" placeholderTextColor={C.textMuted} keyboardType="phone-pad" />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput style={styles.fieldInput} value={email} onChangeText={setEmail}
                  placeholder="email@example.com" placeholderTextColor={C.textMuted} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.typeRow}>
                  {TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, type === t && { backgroundColor: typeColor(t) + "30", borderColor: typeColor(t) }]}
                      onPress={() => { Haptics.selectionAsync(); setType(t); }}
                    >
                      <Text style={[styles.typeBtnText, type === t && { color: typeColor(t) }]}>{typeLabel(t)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <LinearGradient colors={["#2952C4", "#1A3C8F"]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Add Contact</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 4, marginBottom: 16 },
  searchRow: { marginBottom: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 14 },
  filters: { flexDirection: "row" },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.primary + "20", borderColor: C.primary },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  filterTextActive: { color: C.primary },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  avatar: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, marginLeft: 12, gap: 3 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  phone: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary },
  email: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.textSecondary, flex: 1 },
  right: { alignItems: "flex-end", gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, overflow: "hidden", elevation: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  modal: { flex: 1, backgroundColor: C.card },
  modalHandle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  modalContent: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  fieldInput: {
    backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 15,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center",
  },
  typeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGradient: { height: 54, justifyContent: "center", alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
