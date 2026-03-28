import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Toast from "react-native-root-toast";
import { useFuel } from "@/context/FuelContext";
import { D } from "@/constants/theme";

const FUEL_PRIMARY = "#1a3a2a";

interface BudgetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BudgetSettingsModal({ visible, onClose }: BudgetSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { budget, updateBudget } = useFuel();
  const [monthlyLimit, setMonthlyLimit] = useState("5000");
  const [alertThreshold, setAlertThreshold] = useState("70");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (budget) {
      setMonthlyLimit(budget.monthlyLimit.toString());
      setAlertThreshold(budget.alertThreshold.toString());
    }
  }, [budget]);

  const handleSave = async () => {
    const limit = parseFloat(monthlyLimit) || 0;
    const threshold = parseFloat(alertThreshold) || 70;
    
    if (limit <= 0) {
      Toast.show("Veuillez entrer une limite valide", { duration: 2000, backgroundColor: D.rose });
      return;
    }

    setIsSaving(true);
    try {
      await updateBudget({
        truckId: "TRUCK-01",
        monthlyLimit: limit,
        alertThreshold: threshold,
      });
      Toast.show("Paramètres sauvegardés!", { duration: 2000, backgroundColor: D.emerald });
      onClose();
    } catch (e) {
      Toast.show("Erreur lors de la sauvegarde", { duration: 2000, backgroundColor: D.rose });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Paramètres Budget</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color={D.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Limite mensuelle (MAD)</Text>
            <TextInput
              style={styles.input}
              placeholder="5000"
              keyboardType="decimal-pad"
              value={monthlyLimit}
              onChangeText={setMonthlyLimit}
              placeholderTextColor={D.inkGhost}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Seuil d'alerte (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              keyboardType="decimal-pad"
              value={alertThreshold}
              onChangeText={setAlertThreshold}
              placeholderTextColor={D.inkGhost}
            />
            <Text style={styles.hint}>Une alerte apparaît quand {alertThreshold}% du budget est utilisé</Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnTxt}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  content: { backgroundColor: D.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: D.ink },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: D.inkMid, marginBottom: 6 },
  input: { backgroundColor: D.bg, borderRadius: 12, padding: 14, fontSize: 16, color: D.ink, borderWidth: 1, borderColor: D.border },
  hint: { fontSize: 11, color: D.inkSoft, marginTop: 6 },
  saveBtn: { backgroundColor: FUEL_PRIMARY, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
