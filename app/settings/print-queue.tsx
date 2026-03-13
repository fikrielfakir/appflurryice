import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { D } from "@/constants/theme";
import { usePrintInvoice, PrinterDevice } from "@/hooks/usePrintInvoice";
import Toast from "react-native-root-toast";

const PRINT_QUEUE_KEY = '@bizpos_print_queue';

interface PrintQueueItem {
  id: string;
  sale: {
    invoiceNumber: string;
    customerName: string;
    amount: number;
    date: string;
  };
  type: 'invoice' | 'transfer' | 'dailySummary';
  createdAt: string;
}

export default function PrintQueueScreen() {
  const insets = useSafeAreaInsets();
  const { currentPrinter, scanPrinters, connectPrinter, isConnecting } = usePrintInvoice();
  const [queue, setQueue] = useState<PrintQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);

  const loadQueue = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(PRINT_QUEUE_KEY);
      if (data) {
        setQueue(JSON.parse(data));
      } else {
        setQueue([]);
      }
    } catch (e) {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handlePrintNow = async () => {
    if (!currentPrinter) {
      Toast.show("Connectez d'abord une imprimante", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: D.rose,
      });
      return;
    }

    if (queue.length === 0) return;

    setProcessing(true);
    try {
      const Print = require('expo-print').default;
      
      for (const item of queue) {
        try {
          const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
            <style>body{width:384px;font-family:Arial,sans-serif;padding:20px;}
            h2{text-align:center;font-size:16px;font-weight:900;margin-bottom:10px;}
            .row{display:flex;justify-content:space-between;margin:5px 0;}
            .total{font-size:20px;font-weight:900;border-top:2px solid #000;margin-top:10px;padding-top:10px;}
            </style></head><body>
            <h2>FACTURE #${item.sale.invoiceNumber}</h2>
            <div class="row"><span>Client:</span><span>${item.sale.customerName}</span></div>
            <div class="row"><span>Date:</span><span>${new Date(item.sale.date).toLocaleDateString()}</span></div>
            <div class="total">Total: MAD ${item.sale.amount.toFixed(2)}</div>
            </body></html>`;
          
          await Print.printAsync({ html, width: 384 });
        } catch (e) {
          console.log('Print error for item:', item.id, e);
        }
      }
      
      await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify([]));
      setQueue([]);
      Toast.show("Impression terminée", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: D.emerald,
      });
    } catch (e) {
      Toast.show("Erreur d'impression", {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        backgroundColor: D.rose,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const newQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify(newQueue));
    setQueue(newQueue);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearAll = async () => {
    await AsyncStorage.setItem(PRINT_QUEUE_KEY, JSON.stringify([]));
    setQueue([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleScanPrinters = async () => {
    const devices = await scanPrinters();
    setPrinters(devices);
  };

  const handleConnectPrinter = async (printer: PrinterDevice) => {
    await connectPrinter(printer);
    Toast.show(`Connecté à ${printer.name}`, {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      backgroundColor: D.emerald,
    });
    setPrinters([]);
  };

  const renderItem = ({ item }: { item: PrintQueueItem }) => (
    <View style={S.card}>
      <View style={S.cardRow}>
        <View style={[S.iconBox, { backgroundColor: D.amberBg }]}>
          <Feather name="file-text" size={18} color={D.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.cardTitle}>Facture #{item.sale.invoiceNumber}</Text>
          <Text style={S.cardSub}>{item.sale.customerName}</Text>
          <Text style={S.cardMeta}>MAD {item.sale.amount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          style={S.deleteBtn}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Feather name="trash-2" size={16} color={D.rose} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>
      {/* Header */}
      <View style={S.header}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        
        <View style={S.headerRow}>
          <TouchableOpacity style={S.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={S.headerTitle}>File d'impression</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Printer Status */}
      <View style={S.printerCard}>
        <View style={S.printerRow}>
          <View style={[S.iconBox, { backgroundColor: currentPrinter ? D.emeraldBg : D.roseBg }]}>
            <Feather name="printer" size={20} color={currentPrinter ? D.emerald : D.rose} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.printerLabel}>
              {currentPrinter ? currentPrinter.name : "Aucune imprimante"}
            </Text>
            <Text style={S.printerStatus}>
              {currentPrinter ? "Connectée" : "Non connectée"}
            </Text>
          </View>
          <TouchableOpacity 
            style={S.scanBtn} 
            onPress={handleScanPrinters}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={D.heroAccent} />
            ) : (
              <Feather name="refresh-cw" size={16} color={D.heroAccent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Printer List */}
        {printers.length > 0 && (
          <View style={S.printerList}>
            {printers.map(printer => (
              <TouchableOpacity 
                key={printer.id}
                style={S.printerItem}
                onPress={() => handleConnectPrinter(printer)}
              >
                <Feather name="bluetooth" size={14} color={D.blue} />
                <Text style={S.printerItemTxt}>{printer.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Queue Count */}
      <View style={S.queueHeader}>
        <Text style={S.queueCount}>
          {queue.length} impression{queue.length !== 1 ? 's' : ''} en attente
        </Text>
        {queue.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={S.clearAll}>Tout effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Queue List */}
      {loading ? (
        <View style={S.empty}>
          <ActivityIndicator size="large" color={D.heroAccent} />
        </View>
      ) : queue.length === 0 ? (
        <View style={S.empty}>
          <View style={[S.emptyIcon, { backgroundColor: D.bg }]}>
            <Feather name="printer" size={28} color={D.inkSoft} />
          </View>
          <Text style={S.emptyTitle}>Aucune impression</Text>
          <Text style={S.emptyDesc}>Les impressions en attente apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Print Button */}
      {queue.length > 0 && (
        <View style={[S.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity 
            style={[S.printBtn, processing && S.printBtnDisabled]}
            onPress={handlePrintNow}
            disabled={processing || !currentPrinter}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="play" size={18} color="#fff" />
                <Text style={S.printBtnTxt}>Imprimer maintenant</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },
  
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },

  printerCard: {
    backgroundColor: D.card,
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: D.border,
  },
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44, height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: D.ink,
  },
  printerStatus: {
    fontSize: 12,
    color: D.inkSoft,
    marginTop: 2,
  },
  scanBtn: {
    width: 40, height: 40,
    borderRadius: 10,
    backgroundColor: D.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: D.border,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  printerItemTxt: {
    fontSize: 14,
    color: D.ink,
  },

  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  queueCount: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: D.ink,
  },
  clearAll: {
    fontSize: 13,
    color: D.rose,
    fontFamily: 'Inter_500Medium',
  },

  list: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: D.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: D.ink,
  },
  cardSub: {
    fontSize: 12,
    color: D.inkSoft,
    marginTop: 2,
  },
  cardMeta: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: D.emerald,
    marginTop: 4,
  },
  deleteBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: D.roseBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    width: 64, height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: D.inkMid,
  },
  emptyDesc: {
    fontSize: 13,
    color: D.inkSoft,
    marginTop: 4,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: D.surface,
    borderTopWidth: 1,
    borderTopColor: D.border,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: D.heroAccent,
    height: 52,
    borderRadius: 14,
  },
  printBtnDisabled: {
    opacity: 0.6,
  },
  printBtnTxt: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
