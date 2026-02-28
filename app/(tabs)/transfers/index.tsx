import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useApp, Transfer } from '@/context/AppContext';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = Colors.dark;

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const { transfers, addTransfer } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const transferData: Transfer = JSON.parse(data);
      if (transferData.id && transferData.items) {
        addTransfer(transferData);
        Alert.alert("Success", `Transfer ${transferData.ref} recorded successfully.`);
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      Alert.alert("Error", "Invalid QR code format. Please scan a valid transfer JSON.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Transfers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setScanning(true)}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transfers}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.ref}>{item.ref}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={styles.route}>
              <Text style={styles.loc}>{item.from}</Text>
              <Feather name="arrow-right" size={14} color={C.textSecondary} />
              <Text style={styles.loc}>{item.to}</Text>
            </View>
            <View style={styles.items}>
              {item.items.map((it, idx) => (
                <Text key={idx} style={styles.itemText}>
                  • {it.name} ({it.qty} {it.unit})
                </Text>
              ))}
            </View>
            <Text style={styles.total}>Total: {item.total} MAD</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="repeat" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>No transfers yet. Scan a QR code to add one.</Text>
          </View>
        }
      />

      <Modal visible={scanning} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setScanning(false)}>
            <Feather name="x" size={32} color="#fff" />
          </TouchableOpacity>
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Scan Transfer QR Code</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#fff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 5 },
  addBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ref: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.gold },
  date: { fontSize: 12, color: C.textSecondary },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  loc: { fontSize: 14, color: '#fff', fontFamily: 'Inter_500Medium' },
  items: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 4 },
  itemText: { fontSize: 13, color: C.textSecondary },
  total: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#fff', marginTop: 10, textAlign: 'right' },
  text: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: C.primary, padding: 15, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  overlay: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  overlayText: { color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  empty: { alignItems: 'center', marginTop: 100, gap: 15 },
  emptyText: { color: C.textMuted, fontSize: 16, textAlign: 'center', paddingHorizontal: 40 },
});
