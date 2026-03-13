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
import { ConfirmModal } from '@/components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-root-toast';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from '@/components/common/AppHeader';
import { D } from '@/constants/theme';

export default function PrinterSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    currentPrinter,
    isScanning,
    isConnecting,
    isPrinting,
    isSuccess,
    availablePrinters,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    printTest,
    error,
  } = usePrintInvoice();

  const [selectedPrinter, setSelectedPrinter]         = useState<PrinterDevice | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    if (currentPrinter) setSelectedPrinter(currentPrinter);
  }, [currentPrinter]);

  const handleScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await scanPrinters();
  };

  const handleConnect = async (printer: PrinterDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPrinter(printer);
    await connectPrinter(printer);
    Toast.show(`Connecté à ${printer.name}`, {
      duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
    });
  };

  const handleDisconnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = async () => {
    await disconnectPrinter();
    setSelectedPrinter(null);
    setShowDisconnectConfirm(false);
    Toast.show('Imprimante déconnectée', {
      duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose,
    });
  };

  const handlePrintTest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await printTest();
    Toast.show("Test envoyé à l'imprimante", {
      duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
    });
  };

  // ── Printer list item ────────────────────────────────────────────────────
  const renderPrinter = ({ item, index }: { item: PrinterDevice; index: number }) => {
    const isSelected = selectedPrinter?.id === item.id;
    return (
      <TouchableOpacity
        style={[S.printerRow, index > 0 && S.printerRowBorder, isSelected && S.printerRowSelected]}
        onPress={() => handleConnect(item)}
        activeOpacity={0.78}
      >
        {isSelected && <View style={S.printerAccent} />}
        <View style={[S.printerIconWrap, { backgroundColor: isSelected ? D.emeraldBg : D.bg }]}>
          <Feather name="printer" size={20} color={isSelected ? D.emerald : D.inkSoft} />
          {isSelected && (
            <View style={S.printerCheckBadge}>
              <Feather name="check" size={8} color="#fff" />
            </View>
          )}
        </View>
        <View style={S.printerBody}>
          <Text style={[S.printerName, isSelected && { color: D.emerald }]}>{item.name}</Text>
          <Text style={S.printerId}>{item.id}</Text>
        </View>
        {isSelected ? (
          <View style={S.connectedPill}>
            <View style={[S.stockDot, { backgroundColor: D.emerald }]} />
            <Text style={[S.pillTxt, { color: D.emerald }]}>Connecté</Text>
          </View>
        ) : (
          <View style={S.connectPill}>
            <Feather name="bluetooth" size={11} color={D.heroAccent} />
            <Text style={[S.pillTxt, { color: D.heroAccent }]}>Lier</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t('settings.printerSettings') || 'Imprimante'}
          dark
          showBack
          onBackPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        />

        {/* Toolbar */}
        <View style={S.toolbar}>
          <View style={S.countChip}>
            <Feather name="printer" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={S.countChipTxt}>
              {currentPrinter ? currentPrinter.name : 'Aucune imprimante'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[S.scanBtn, isScanning && { opacity: 0.6 }]}
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
              : <Feather name="bluetooth" size={13} color="rgba(255,255,255,0.9)" />
            }
            <Text style={S.scanBtnTxt}>{isScanning ? 'Scan…' : 'Scanner'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      <FlatList
        data={availablePrinters}
        keyExtractor={(item) => item.id}
        renderItem={renderPrinter}
        style={S.list}
        contentContainerStyle={[S.listContent, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <View>
            {/* Error banner */}
            {!!error && (
              <View style={S.errorBanner}>
                <Feather name="alert-circle" size={15} color={D.rose} />
                <Text style={S.errorTxt}>{error}</Text>
              </View>
            )}

            {/* Status card */}
            <Text style={S.sectionLbl}>État de connexion</Text>
            <View style={S.card}>
              {currentPrinter ? (
                <>
                  {/* Printer name row */}
                  <View style={S.statusRow}>
                    <View style={[S.statusIcon, { backgroundColor: D.emeraldBg }]}>
                      <Feather name="printer" size={18} color={D.emerald} />
                    </View>
                    <View style={S.statusBody}>
                      <Text style={S.statusLabel}>Imprimante</Text>
                      <Text style={S.statusValue}>{currentPrinter.name}</Text>
                    </View>
                    <View style={S.connectedPill}>
                      <View style={[S.stockDot, { backgroundColor: D.emerald }]} />
                      <Text style={[S.pillTxt, { color: D.emerald }]}>Connectée</Text>
                    </View>
                  </View>

                  {/* Bluetooth row */}
                  <View style={[S.statusRow, S.statusRowBorder]}>
                    <View style={[S.statusIcon, { backgroundColor: D.blueBg }]}>
                      <Feather name="bluetooth" size={18} color={D.blue} />
                    </View>
                    <View style={S.statusBody}>
                      <Text style={S.statusLabel}>Protocole</Text>
                      <Text style={S.statusValue}>Bluetooth BLE · ESC/POS</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={[S.statusRow, S.statusRowBorder, { gap: 10 }]}>
                    {/* Print test */}
                    <TouchableOpacity
                      style={[S.testBtn, isPrinting && { opacity: 0.6 }]}
                      onPress={handlePrintTest}
                      disabled={isPrinting}
                    >
                      <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.testBtnInner}>
                        {isPrinting
                          ? <ActivityIndicator size="small" color="#fff" />
                          : isSuccess
                            ? <Feather name="check-circle" size={14} color="#fff" />
                            : <Feather name="printer" size={14} color="#fff" />
                        }
                        <Text style={S.testBtnTxt}>
                          {isPrinting ? 'Impression…' : isSuccess ? 'Succès!' : 'Imprimer test'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Disconnect */}
                    <TouchableOpacity style={S.disconnectBtn} onPress={handleDisconnect}>
                      <Feather name="x-circle" size={14} color={D.rose} />
                      <Text style={S.disconnectTxt}>Déconnecter</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* No printer */
                <View style={S.noPrinterWrap}>
                  <View style={S.emptyIcon}>
                    <Feather name="bluetooth" size={28} color={D.heroAccent} />
                  </View>
                  <Text style={S.emptyTitle}>Aucune imprimante connectée</Text>
                  <Text style={S.emptyDesc}>Scannez pour trouver une imprimante Bluetooth</Text>
                </View>
              )}
            </View>

            {/* Available printers label */}
            <Text style={S.sectionLbl}>Imprimantes disponibles</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={S.card}>
            <View style={S.emptyWrap}>
              <View style={S.emptyIcon}>
                <Feather name="bluetooth" size={28} color={D.heroAccent} />
              </View>
              <Text style={S.emptyTitle}>
                {isScanning ? 'Recherche en cours…' : 'Aucune imprimante trouvée'}
              </Text>
              <Text style={S.emptyDesc}>
                {isScanning ? 'Veuillez patienter' : 'Appuyez sur Scanner pour démarrer'}
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          availablePrinters.length > 0 ? (
            /* Info pills */
            <View style={S.infoRow}>
              <View style={S.infoPill}>
                <Feather name="info" size={11} color={D.inkSoft} />
                <Text style={S.infoTxt}>Papier 58mm · 48 colonnes</Text>
              </View>
              <View style={S.infoPill}>
                <Feather name="bluetooth" size={11} color={D.inkSoft} />
                <Text style={S.infoTxt}>ESC/POS BLE</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Connecting overlay */}
      {isConnecting && (
        <View style={S.loadingOverlay}>
          <View style={S.loadingCard}>
            <ActivityIndicator size="large" color={D.heroAccent} />
            <Text style={S.loadingTxt}>Connexion…</Text>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={showDisconnectConfirm}
        title={t('printer.disconnect') || 'Déconnecter'}
        message={t('printer.disconnectConfirm') || "Voulez-vous déconnecter l'imprimante?"}
        confirmText={t('printer.disconnect') || 'Déconnecter'}
        cancelText={t('common.cancel') || 'Annuler'}
        type="danger"
        onConfirm={confirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60 },
  blob2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 10, left: -30 },

  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 8 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countChipTxt: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  scanBtnTxt: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // List
  list: { flex: 1 },
  listContent: { padding: 14 },

  sectionLbl: { color: D.inkSoft, fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 18, marginLeft: 2 },

  card: { backgroundColor: D.card, borderRadius: 18, borderWidth: 1, borderColor: D.border, overflow: 'hidden', elevation: 2, shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },

  // Status card rows
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  statusRowBorder: { borderTopWidth: 1, borderTopColor: D.border },
  statusIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusBody: { flex: 1 },
  statusLabel: { color: D.inkSoft, fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusValue: { color: D.ink, fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 1 },

  // Pills
  connectedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: D.emeraldBg },
  connectPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: D.violetBg },
  stockDot: { width: 5, height: 5, borderRadius: 3 },
  pillTxt: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Action buttons inside status card
  testBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  testBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  testBtnTxt: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  disconnectBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: D.roseBg, borderWidth: 1, borderColor: D.rose + '40', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  disconnectTxt: { color: D.rose, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  // No printer / empty
  noPrinterWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: D.violetBg, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { color: D.ink, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyDesc: { color: D.inkSoft, fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },

  // Printer list rows
  printerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, overflow: 'hidden' },
  printerRowBorder: { borderTopWidth: 1, borderTopColor: D.border },
  printerRowSelected: { backgroundColor: D.emeraldBg + '60' },
  printerAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: D.emerald },
  printerIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: D.border },
  printerCheckBadge: { position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderBottomLeftRadius: 6, backgroundColor: D.emerald, justifyContent: 'center', alignItems: 'center' },
  printerBody: { flex: 1 },
  printerName: { color: D.ink, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  printerId: { color: D.inkSoft, fontSize: 11, marginTop: 2 },

  // Info footer
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.card, borderWidth: 1, borderColor: D.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  infoTxt: { color: D.inkSoft, fontSize: 11 },

  // Error banner
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: D.roseBg, borderWidth: 1, borderColor: D.rose + '50', borderRadius: 14, padding: 12, marginBottom: 6 },
  errorTxt: { flex: 1, color: D.rose, fontSize: 13 },

  // Loading overlay
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  loadingCard: { backgroundColor: D.surface, borderRadius: 20, padding: 28, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: D.border },
  loadingTxt: { color: D.ink, fontSize: 15, fontFamily: 'Inter_500Medium' },
});