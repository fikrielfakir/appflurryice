import React, { useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Dimensions, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { Brand } from "@/context/AppContext";
import { D } from "@/constants/theme";

const { width } = Dimensions.get("window");
const FUEL_PRIMARY = "#1a3a2a";

const BRAND_COLORS = [
  "#1a3a2a", "#dc2626", "#2563eb", "#16a34a",
  "#d97706", "#7c3aed", "#db2777", "#0891b2",
];

interface BrandSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BrandSettingsModal({ visible, onClose }: BrandSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { brands, addBrand, updateBrand, deleteBrand, products } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(BRAND_COLORS[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setEditName("");
    setEditColor(BRAND_COLORS[0]);
    setShowAddForm(false);
    setNewName("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditColor(brand.color || BRAND_COLORS[0]);
    setShowAddForm(false);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateBrand(editingId!, { name: editName.trim(), color: editColor });
    resetForm();
  };

  const handleDelete = (brand: Brand) => {
    const usedCount = products.filter(p => p.brandId === brand.id).length;
    const msg = usedCount > 0
      ? `Cette marque est utilisée par ${usedCount} produit${usedCount > 1 ? "s" : ""}. Voulez-vous la supprimer quand même ?`
      : "Voulez-vous supprimer cette marque ?";
    Alert.alert("Supprimer la marque", msg, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await deleteBrand(brand.id);
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addBrand({ name: newName.trim(), color: BRAND_COLORS[brands.length % BRAND_COLORS.length] });
    setNewName("");
    setShowAddForm(false);
  };

  const renderBrand = ({ item }: { item: Brand }) => {
    const usedCount = products.filter(p => p.brandId === item.id).length;
    const isEditing = editingId === item.id;

    return (
      <View style={S.brandRow}>
        <View style={[S.colorDot, { backgroundColor: item.color || "#1a3a2a" }]} />
        {isEditing ? (
          <View style={S.editForm}>
            <TextInput
              style={S.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom de la marque"
              autoFocus
            />
            <View style={S.colorPicker}>
              {BRAND_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[S.colorChip, { backgroundColor: c }, editColor === c && S.colorChipActive]}
                  onPress={() => setEditColor(c)}
                />
              ))}
            </View>
            <View style={S.editActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={resetForm}>
                <Text style={S.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.saveBtn} onPress={handleSaveEdit}>
                <Text style={S.saveTxt}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={S.brandInfo}>
              <Text style={S.brandName}>{item.name}</Text>
              <Text style={S.brandUsed}>
                {usedCount > 0 ? `${usedCount} produit${usedCount > 1 ? "s" : ""}` : "Non utilisé"}
              </Text>
            </View>
            <View style={S.brandActions}>
              <TouchableOpacity style={S.iconBtn} onPress={() => handleEdit(item)}>
                <Feather name="edit-2" size={16} color={D.blue} />
              </TouchableOpacity>
              <TouchableOpacity style={S.iconBtn} onPress={() => handleDelete(item)}>
                <Feather name="trash-2" size={16} color={D.rose} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[S.wrap, { paddingTop: insets.top + 10 }]}>
        <View style={S.header}>
          <Text style={S.title}>Marques</Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={22} color={D.ink} />
          </TouchableOpacity>
        </View>

        {showAddForm ? (
          <View style={S.addForm}>
            <TextInput
              style={S.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de la nouvelle marque"
              autoFocus
            />
            <View style={S.colorPicker}>
              {BRAND_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[S.colorChip, { backgroundColor: c }]}
                  onPress={() => {}}
                />
              ))}
            </View>
            <View style={S.editActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setShowAddForm(false)}>
                <Text style={S.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.addBtn} onPress={handleAdd}>
                <Text style={S.addBtnTxt}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={S.addBtnRow} onPress={() => setShowAddForm(true)}>
            <Feather name="plus" size={18} color={FUEL_PRIMARY} />
            <Text style={S.addBtnLabel}>Ajouter une marque</Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={brands}
          keyExtractor={item => item.id}
          renderItem={renderBrand}
          style={S.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={S.empty}>
              <Text style={S.emptyTxt}>Aucune marque</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: D.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: D.border },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: D.ink },
  addBtnRow: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16, padding: 14, backgroundColor: D.surface, borderRadius: 12, borderWidth: 1.5, borderColor: D.border, borderStyle: "dashed" },
  addBtnLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: FUEL_PRIMARY },
  list: { flex: 1, paddingHorizontal: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", backgroundColor: D.surface, padding: 14, borderRadius: 12, marginBottom: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  brandInfo: { flex: 1 },
  brandName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },
  brandUsed: { fontSize: 12, color: D.inkSoft, marginTop: 2 },
  brandActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: D.bg, justifyContent: "center", alignItems: "center" },
  editForm: { flex: 1 },
  editInput: { backgroundColor: D.bg, borderRadius: 10, borderWidth: 1, borderColor: D.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: D.ink, marginBottom: 8 },
  addInput: { backgroundColor: D.bg, borderRadius: 10, borderWidth: 1, borderColor: D.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: D.ink, marginBottom: 8 },
  colorPicker: { flexDirection: "row", gap: 8, marginBottom: 10 },
  colorChip: { width: 28, height: 28, borderRadius: 14 },
  colorChipActive: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
  editActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: D.border, justifyContent: "center", alignItems: "center" },
  cancelTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  saveBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: FUEL_PRIMARY, justifyContent: "center", alignItems: "center" },
  saveTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  addBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: FUEL_PRIMARY, justifyContent: "center", alignItems: "center" },
  addBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  addForm: { margin: 16, padding: 16, backgroundColor: D.surface, borderRadius: 16 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyTxt: { fontSize: 14, color: D.inkSoft },
});
