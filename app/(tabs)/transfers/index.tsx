import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Dimensions, Platform, Modal, Pressable, ScrollView, Share, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp, Transfer } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants';
import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { usePrintInvoice } from '@/hooks/usePrintInvoice';

const C = Colors;
const { width } = Dimensions.get('window');

import Toast from 'react-native-root-toast';

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const { transfers, addTransfer, products, setIsSidebarOpen } = useApp();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showPrintOverlay, setShowPrintOverlay] = useState(false);
  const [showTransferOutModal, setShowTransferOutModal] = useState(false);
  const [transferOutSelection, setTransferOutSelection] = useState<{[key: string]: number}>({});
  const [showTransferOutInvoice, setShowTransferOutInvoice] = useState(false);
  const { printTransfer, isConnecting, isPrinting, isSuccess, error: printError, currentPrinter } = usePrintInvoice();

  useEffect(() => {
    if (isConnecting || isPrinting) {
      setShowPrintOverlay(true);
    } else if (isSuccess) {
      setShowPrintOverlay(false);
      Toast.show(t('printer.success'), { duration: 2000, backgroundColor: C.success });
    } else if (printError) {
      setShowPrintOverlay(false);
      Toast.show(printError, { duration: 2000, backgroundColor: C.danger });
    }
  }, [isConnecting, isPrinting, isSuccess, printError]);

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
          from: transferData.from || "flurryice",
          to: transferData.to || "Unknown",
          total: transferData.total || 0,
          sig: transferData.sig || ""
        };
        
        // Check if transfer with same ref already exists
        const existingTransfer = transfers.find(t => t.ref === newTransfer.ref);
        if (existingTransfer) {
          Toast.show(`${t('transfers.alreadyExists') || 'Transfer already exists'}: ${newTransfer.ref}`, {
            duration: Toast.durations.SHORT,
            position: Toast.positions.BOTTOM,
            backgroundColor: C.warning,
          });
          return;
        }
        
        addTransfer(newTransfer);
        Toast.show(`Transfer ${newTransfer.ref} recorded and stock updated.`, {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          backgroundColor: C.success,
      });
    } else {
      Toast.show("Invalid QR code format.", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: C.danger,
      });
    }
  } catch (e) {
    console.error(e);
    Toast.show("Failed to parse QR code.", {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: C.danger,
    });
  }
  };

  const handlePrint = (item: Transfer) => {
    setSelectedTransfer(item);
    setShowDetailSheet(true);
  };

  const handleView = (item: Transfer) => {
    setSelectedTransfer(item);
    setShowDetailSheet(true);
  };

  const handleShare = async (item: Transfer) => {
    try {
      const message = `Transfer #${item.ref}\nFrom: ${item.from}\nTo: ${item.to}\nItems: ${item.items.length}\nTotal: MAD ${item.total}\nDate: ${new Date(item.date).toLocaleDateString()}`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const productsWithStock = products.filter(p => p.stock > 0);

  const handleTransferOutProduct = (productId: string) => {
    const currentQty = transferOutSelection[productId] || 0;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (currentQty >= product.stock) {
      Toast.show(`Max stock: ${product.stock}`, { duration: 1000, backgroundColor: C.warning });
      return;
    }
    
    setTransferOutSelection(prev => ({
      ...prev,
      [productId]: currentQty + 1
    }));
  };

  const handleTransferOutQtyChange = (productId: string, newQty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (newQty > product.stock || newQty < 0) return;
    
    if (newQty === 0) {
      const { [productId]: _, ...rest } = transferOutSelection;
      setTransferOutSelection(rest);
    } else {
      setTransferOutSelection(prev => ({ ...prev, [productId]: newQty }));
    }
  };

  const completeTransferOut = () => {
    if (Object.keys(transferOutSelection).length === 0) {
      Toast.show(t('transfers.selectProducts'), { duration: 1000, backgroundColor: C.danger });
      return;
    }

    const items = Object.entries(transferOutSelection).map(([productId, qty]) => {
      const product = products.find(p => p.id === productId);
      return {
        productId,
        sku: product?.sku || '',
        name: product?.name || `Product ${productId}`,
        qty,
        unit: product?.unit || '0',
      };
    });

    const total = items.reduce((sum, item) => sum + (item.qty * parseFloat(item.unit)), 0);
    const ref = `TR-OUT-${Date.now()}`;

    const newTransfer: Transfer = {
      id: ref,
      ref,
      items,
      date: new Date().toISOString(),
      from: 'Truck',
      to: 'Main Warehouse',
      total,
      sig: ''
    };

    addTransfer(newTransfer);
    setSelectedTransfer(newTransfer);
    setShowTransferOutModal(false);
    setTransferOutSelection({});
    setShowDetailSheet(true);
    Toast.show(t('transfers.transferred'), { duration: 2000, backgroundColor: C.success });
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
      <View style={styles.transferActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrint(item)}>
          <Feather name="printer" size={16} color={C.primary} />
          <Text style={styles.actionText}>{t('common.print')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleView(item)}>
          <Feather name="eye" size={16} color={C.primary} />
          <Text style={styles.actionText}>{t('common.view')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
          <Feather name="share-2" size={16} color={C.primary} />
          <Text style={styles.actionText}>{t('common.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader 
        title={t('transfers.title')}
        dark
        showMenu
        onMenuPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsSidebarOpen(true);
        }}
        rightActions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.scanBtnHeader}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowTransferOutModal(true);
              }}
            >
              <Feather name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.scanBtnHeader} 
              onPress={() => setScanning(true)}
            >
              <Feather name="maximize" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

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

      <Modal
        visible={showDetailSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailSheet(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetailSheet(false)}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            
            {selectedTransfer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.invoiceHeader}>
                  <Text style={styles.invoiceTitle}>{t('transfers.title')}</Text>
                  <Text style={styles.invoiceRef}>#{selectedTransfer.ref}</Text>
                </View>

                <View style={styles.invoiceInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('transfers.date')}:</Text>
                    <Text style={styles.infoValue}>{new Date(selectedTransfer.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('transfers.from')}:</Text>
                    <Text style={styles.infoValue}>{selectedTransfer.from}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('transfers.to')}:</Text>
                    <Text style={styles.infoValue}>{selectedTransfer.to}</Text>
                  </View>
                </View>

                <View style={styles.itemsSection}>
                  <Text style={styles.sectionTitle}>{t('transfers.items')} ({selectedTransfer.items.length})</Text>
                  {selectedTransfer.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name || `Item ${index + 1}`}</Text>
                        <Text style={styles.itemQty}>x{item.qty}</Text>
                      </View>
                      <Text style={styles.itemPrice}>MAD {(item.qty * (item.unit ? parseFloat(item.unit) : 0)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>{t('transfers.total')}</Text>
                  <Text style={styles.totalValue}>MAD {selectedTransfer.total}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.printButton, (isConnecting || isPrinting) && styles.printButtonDisabled]}
                  onPress={async () => {
                    if (!currentPrinter) {
                      Toast.show(t('printer.notConnected'), { duration: 2000, backgroundColor: C.danger });
                      return;
                    }
                    await printTransfer(selectedTransfer);
                  }}
                  disabled={isConnecting || isPrinting}
                >
                  {isConnecting || isPrinting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="printer" size={20} color="#fff" />
                      <Text style={styles.printButtonText}>
                        {isConnecting ? t('printer.connecting') : isPrinting ? t('printer.printing') : t('common.print')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailSheet(false)}
            >
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPrintOverlay}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.printOverlay}>
          <View style={styles.printOverlayContent}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.printOverlayText}>
              {isConnecting ? t('printer.connecting') : t('printer.printing')}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTransferOutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferOutModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTransferOutModal(false)}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.invoiceTitle}>{t('transfers.transferOut')} - {productsWithStock.length} {t('products.products')}</Text>
            
            {productsWithStock.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Feather name="package" size={48} color={C.textMuted} />
                <Text style={styles.emptyText}>No products with stock available</Text>
              </View>
            ) : (
              <FlatList
                data={productsWithStock}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const selectedQty = transferOutSelection[item.id] || 0;
                  return (
                    <View style={[styles.transferOutItem, { backgroundColor: selectedQty > 0 ? C.primary + '10' : 'transparent' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.itemQty, { color: C.textMuted }]}>Stock: {item.stock}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {selectedQty > 0 && (
                          <>
                            <TouchableOpacity 
                              style={[styles.qtyBtn, { backgroundColor: C.danger }]}
                              onPress={() => handleTransferOutQtyChange(item.id, selectedQty - 1)}
                            >
                              <Feather name="minus" size={14} color="#fff" />
                            </TouchableOpacity>
                            <Text style={[styles.qtyText, { color: C.text }]}>{selectedQty}</Text>
                          </>
                        )}
                        <TouchableOpacity 
                          style={[styles.qtyBtn, { backgroundColor: selectedQty > 0 ? C.primary : C.success }]}
                          onPress={() => handleTransferOutProduct(item.id)}
                        >
                          <Feather name={selectedQty > 0 ? "plus" : "plus"} size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 8 }}
                style={{ maxHeight: 400, marginBottom: 16 }}
              />
            )}

            <TouchableOpacity 
              style={[styles.completeBtn, Object.keys(transferOutSelection).length === 0 && styles.completeBtnDisabled]}
              onPress={completeTransferOut}
              disabled={Object.keys(transferOutSelection).length === 0}
            >
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.completeBtnText}>{t('common.complete')} - {Object.keys(transferOutSelection).length} {t('products.items')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowTransferOutModal(false);
                setTransferOutSelection({});
              }}
            >
              <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  scanBtnHeader: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: C.textPrimary },
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
  transferRef: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.textPrimary },
  transferDate: { fontSize: 12, color: C.textMuted },
  transferPath: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  transferLocation: { fontSize: 14, color: C.textSecondary, fontFamily: 'Inter_500Medium' },
  transferItemsCount: { fontSize: 13, color: C.accent, fontFamily: 'Inter_600SemiBold' },
  transferActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  actionText: { fontSize: 12, color: C.primary, fontFamily: 'Inter_500Medium' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: C.textPrimary, fontSize: 18, fontFamily: 'Inter_600SemiBold', marginTop: 16 },
  emptySubtext: { color: C.textMuted, fontSize: 14, marginTop: 8 },
  permissionText: { color: C.textPrimary, textAlign: 'center', marginTop: 100, paddingHorizontal: 40 },
  permissionBtn: { backgroundColor: C.primary, padding: 15, borderRadius: 10, alignSelf: 'center', marginTop: 20 },
  permissionBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  unfocusedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  middleContainer: { flexDirection: 'row', height: width * 0.7 },
  focusedContainer: { width: width * 0.7, borderWidth: 2, borderColor: C.primary, borderRadius: 16 },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  cancelBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  invoiceHeader: { alignItems: 'center', marginBottom: 20 },
  invoiceTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: C.textPrimary },
  invoiceRef: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  invoiceInfo: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: C.textSecondary },
  infoValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  itemsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: C.textPrimary, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: C.textPrimary },
  itemQty: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  totalSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.primary + '15', padding: 16, borderRadius: 12, marginBottom: 20 },
  totalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', color: C.textPrimary },
  totalValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: C.primary },
  printButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, padding: 16, borderRadius: 12, marginBottom: 12 },
  printButtonDisabled: { opacity: 0.6 },
  printButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  closeButton: { backgroundColor: C.card, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  closeButtonText: { color: C.textPrimary, fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  printOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  printOverlayContent: { backgroundColor: C.surface, padding: 32, borderRadius: 16, alignItems: 'center', minWidth: 200 },
  printOverlayText: { marginTop: 16, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: C.textPrimary },
  transferOutItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border
  },
  itemName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  itemQty: { fontSize: 12, marginTop: 4 },
  qtyBtn: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  qtyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', minWidth: 24, textAlign: 'center' },
  completeBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: C.success, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
