import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { usePrintInvoice, PrinterDevice } from '@/hooks/usePrintInvoice';
import Colors from '@/constants/colors';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useTranslation } from 'react-i18next';

const C = Colors.dark;

import Toast from 'react-native-root-toast';

export default function PrinterSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    currentPrinter,
    isScanning,
    isConnecting,
    availablePrinters,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    error,
  } = usePrintInvoice();

  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    if (currentPrinter) {
      setSelectedPrinter(currentPrinter);
    }
  }, [currentPrinter]);

  const handleScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await scanPrinters();
  };

  const handleConnect = async (printer: PrinterDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPrinter(printer);
    await connectPrinter(printer);
  };

  const handleDisconnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = async () => {
    await disconnectPrinter();
    setSelectedPrinter(null);
    Toast.show("Imprimante déconnectée", { duration: Toast.durations.SHORT });
    setShowDisconnectConfirm(false);
  };

  const renderPrinter = ({ item }: { item: PrinterDevice }) => (
    <TouchableOpacity
      style={[
        styles.printerItem,
        selectedPrinter?.id === item.id && styles.printerItemSelected,
      ]}
      onPress={() => handleConnect(item)}
    >
      <View style={styles.printerIcon}>
        <Feather name="printer" size={24} color={selectedPrinter?.id === item.id ? C.gold : C.textSecondary} />
      </View>
      <View style={styles.printerInfo}>
        <Text style={styles.printerName}>{item.name}</Text>
        <Text style={styles.printerId}>{item.id}</Text>
      </View>
      {selectedPrinter?.id === item.id && (
        <View style={styles.connectedBadge}>
          <Feather name="check" size={14} color="#4CAF50" />
          <Text style={styles.connectedText}>Connecté</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Imprimante</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>État de connexion</Text>
          <View style={styles.statusCard}>
            {currentPrinter ? (
              <>
                <View style={styles.statusRow}>
                  <Feather name="printer" size={20} color={C.gold} />
                  <Text style={styles.statusLabel}>Imprimante:</Text>
                  <Text style={styles.statusValue}>{currentPrinter.name}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Feather name="bluetooth" size={20} color="#4CAF50" />
                  <Text style={styles.statusLabel}>Statut:</Text>
                  <Text style={[styles.statusValue, { color: '#4CAF50' }]}>Connectée</Text>
                </View>
                <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                  <Feather name="x-circle" size={16} color={C.danger} />
                  <Text style={styles.disconnectText}>Déconnecter</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Feather name="bluetooth" size={32} color={C.textMuted} />
                <Text style={styles.noPrinterText}>Aucune imprimante connectée</Text>
                <Text style={styles.noPrinterSubtext}>
                  Scannez pour trouver une imprimante
                </Text>
              </>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={20} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Imprimantes disponibles</Text>
            <TouchableOpacity
              style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
              onPress={handleScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <>
                  <Feather name="search" size={16} color={C.gold} />
                  <Text style={styles.scanBtnText}>Scanner</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={availablePrinters}
            keyExtractor={(item) => item.id}
            renderItem={renderPrinter}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="bluetooth" size={40} color={C.textMuted} />
                <Text style={styles.emptyText}>
                  {isScanning ? 'Recherche en cours...' : 'Appuyez sur Scanner pour trouver des imprimantes'}
                </Text>
              </View>
            }
            style={styles.printerList}
          />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="info" size={16} color={C.textMuted} />
            <Text style={styles.infoText}>
              Largeur du papier: 58mm (384 points)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="info" size={16} color={C.textMuted} />
            <Text style={styles.infoText}>
              Compatible ESC/POS via Bluetooth BLE
            </Text>
          </View>
        </View>
      </View>

      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Connexion...</Text>
        </View>
      )}

      <ConfirmModal
        visible={showDisconnectConfirm}
        title={t('printer.disconnect') || 'Déconnecter'}
        message={t('printer.disconnectConfirm') || 'Voulez-vous déconnecter l\'imprimante?'}
        confirmText={t('printer.disconnect') || 'Déconnecter'}
        cancelText={t('common.cancel') || 'Annuler'}
        type="danger"
        onConfirm={confirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    flex: 1,
  },
  noPrinterText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: C.textSecondary,
    marginTop: 12,
  },
  noPrinterSubtext: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: C.danger + '20',
  },
  disconnectText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: C.danger,
    marginLeft: 6,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.danger + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.danger,
  },
  errorText: {
    fontSize: 14,
    color: C.danger,
    marginLeft: 8,
    flex: 1,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.gold,
    gap: 6,
  },
  scanBtnActive: {
    opacity: 0.7,
  },
  scanBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: C.gold,
  },
  printerList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 300,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  printerItemSelected: {
    backgroundColor: C.gold + '15',
  },
  printerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  printerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  printerName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  printerId: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  connectedText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  infoSection: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: C.textMuted,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
    fontFamily: 'Inter_500Medium',
  },
});
