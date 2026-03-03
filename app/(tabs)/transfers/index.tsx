import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Dimensions, Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, Transfer } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { router } from 'expo-router';

const C = Colors.dark;
const { width } = Dimensions.get('window');

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const { transfers, addTransfer } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const transferData = JSON.parse(data);
      if (transferData.ref && transferData.items) {
        // Handle new format: find product names for SKUs
        const items = transferData.items.map((item: any) => {
          const product = products.find(p => p.sku === item.sku);
          return {
            ...item,
            name: product?.name || `SKU: ${item.sku}`,
            unit: product?.unit || "Unit"
          };
        });

        const newTransfer: Transfer = {
          ...transferData,
          items,
          id: transferData.id?.toString() || Date.now().toString(),
          date: transferData.date || new Date().toISOString(),
          from: transferData.from || "Unknown",
          to: transferData.to || "Unknown",
          total: transferData.total || 0,
          sig: transferData.sig || ""
        };
        addTransfer(newTransfer);
        Alert.alert("Success", `Transfer ${newTransfer.ref} recorded and stock updated.`);
      } else {
        Alert.alert("Error", "Invalid QR code format.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to parse QR code.");
    }
  };

  const renderItem = ({ item }: { item: Transfer }) => (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <Text style={styles.transferRef}>{item.ref}</Text>
        <Text style={styles.transferDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.transferPath}>
        <Text style={styles.transferLocation}>{item.from}</Text>
        <Feather name="arrow-right" size={14} color={C.textMuted} />
        <Text style={styles.transferLocation}>{item.to}</Text>
      </View>
      <Text style={styles.transferItemsCount}>{item.items.length} items · MAD {item.total}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Transfers</Text>
        <TouchableOpacity 
          style={styles.scanBtn} 
          onPress={() => setScanning(true)}
        >
          <Feather name="maximize" size={20} color="#fff" />
          <Text style={styles.scanBtnText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transfers}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="swap-horizontal" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>No transfers recorded yet</Text>
            <Text style={styles.emptySubtext}>Scan a QR code to add a new transfer</Text>
          </View>
        }
      />

      {scanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.middleContainer}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.focusedContainer}></View>
                <View style={styles.unfocusedContainer}></View>
              </View>
              <View style={styles.unfocusedContainer}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setScanning(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  scanBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: C.primary, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 8,
    gap: 8
  },
  scanBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  listContent: { padding: 16, paddingBottom: 100 },
  transferCard: { 
    backgroundColor: C.card, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border
  },
  transferHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  transferRef: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  transferDate: { fontSize: 12, color: C.textMuted },
  transferPath: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  transferLocation: { fontSize: 14, color: C.textSecondary, fontFamily: 'Inter_500Medium' },
  transferItemsCount: { fontSize: 13, color: C.gold, fontFamily: 'Inter_600SemiBold' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#fff', fontSize: 18, fontFamily: 'Inter_600SemiBold', marginTop: 16 },
  emptySubtext: { color: C.textMuted, fontSize: 14, marginTop: 8 },
  permissionText: { color: '#fff', textAlign: 'center', marginTop: 100, paddingHorizontal: 40 },
  permissionBtn: { backgroundColor: C.primary, padding: 15, borderRadius: 10, alignSelf: 'center', marginTop: 20 },
  permissionBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  unfocusedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  middleContainer: { flexDirection: 'row', height: width * 0.7 },
  focusedContainer: { width: width * 0.7, borderWidth: 2, borderColor: C.primary, borderRadius: 16 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  cancelBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
});
