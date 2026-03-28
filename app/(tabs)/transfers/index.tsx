import * as Haptics from "expo-haptics";
import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Platform, Modal, Pressable, ScrollView,
  Share, ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useApp, Transfer } from "@/context/AppContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";
import { usePrintInvoice } from "@/hooks/usePrintInvoice";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

const { width } = Dimensions.get("window");

// Accent cycle for transfer cards
const STRIP_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.violet, D.rose];

// ── Transfer Card ─────────────────────────────────────────────────────────────
function TransferCard({
  item, index, onPrint, onView, onShare,
}: {
  item: Transfer; index: number;
  onPrint: () => void; onView: () => void; onShare: () => void;
}) {
  const accentColor = STRIP_COLORS[index % STRIP_COLORS.length];
  const dateStr = new Date(item.date).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <View style={S.card}>
      {/* Left accent strip */}
      <View style={[S.cardStrip, { backgroundColor: accentColor }]} />

      <View style={S.cardInner}>
        {/* Top row */}
        <View style={S.cardTop}>
          <View style={[S.cardIcon, { backgroundColor: accentColor + "18" }]}>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.cardRef}>{item.ref}</Text>
            <Text style={S.cardDate}>{dateStr}</Text>
          </View>
          <View style={[S.itemsChip, { backgroundColor: D.violetBg }]}>
            <Text style={[S.itemsChipTxt, { color: D.heroAccent }]}>
              {item.items.length} art.
            </Text>
          </View>
        </View>

        {/* Route row */}
        <View style={S.routeRow}>
          <View style={S.routeChip}>
            <Feather name="home" size={10} color={D.inkSoft} />
            <Text style={S.routeTxt} numberOfLines={1}>{item.from}</Text>
          </View>
          <Feather name="arrow-right" size={13} color={D.inkGhost} />
          <View style={S.routeChip}>
            <Feather name="truck" size={10} color={D.inkSoft} />
            <Text style={S.routeTxt} numberOfLines={1}>{item.to}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[S.totalAmt, { color: accentColor }]}>
            MAD {item.total || item.items.reduce((sum: number, i: any) => sum + ((i.qty || 0) * (i.price || 0)), 0).toFixed(2)}
          </Text>
        </View>

        {/* Actions */}
        <View style={S.cardActions}>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.violetBg }]} onPress={onPrint}>
            <Feather name="printer" size={14} color={D.violet} />
            <Text style={[S.actionTxt, { color: D.violet }]}>Imprimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.blueBg }]} onPress={onView}>
            <Feather name="eye" size={14} color={D.blue} />
            <Text style={[S.actionTxt, { color: D.blue }]}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.actionBtn, { backgroundColor: D.emeraldBg }]} onPress={onShare}>
            <Feather name="share-2" size={14} color={D.emerald} />
            <Text style={[S.actionTxt, { color: D.emerald }]}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TransfersScreen() {
  const insets = useSafeAreaInsets();
  const { transfers, addTransfer, products, setIsSidebarOpen, config } = useApp();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]                       = useState(false);
  const [selectedTransfer, setSelectedTransfer]       = useState<Transfer | null>(null);
  const [showDetailSheet, setShowDetailSheet]         = useState(false);
  const [showPrintOverlay, setShowPrintOverlay]       = useState(false);
  const [showTransferOutModal, setShowTransferOutModal] = useState(false);
  const [transferOutSelection, setTransferOutSelection] = useState<{ [key: string]: number }>({});
  const { printTransfer, exportTransferPdf, isConnecting, isPrinting, isSuccess, error: printError, currentPrinter } = usePrintInvoice();

  useEffect(() => {
    if (isConnecting || isPrinting) {
      setShowPrintOverlay(true);
    } else if (isSuccess) {
      setShowPrintOverlay(false);
      Toast.show(t("printer.success"), { duration: 2000, backgroundColor: D.emerald });
    } else if (printError) {
      setShowPrintOverlay(false);
      Toast.show(printError, { duration: 2000, backgroundColor: D.rose });
    }
  }, [isConnecting, isPrinting, isSuccess, printError]);

  // ── Permission screens ──────────────────────────────────────────────────────
  if (!permission) return <View style={[S.screen, { backgroundColor: D.bg }]} />;

  if (!permission.granted) {
    return (
      <View style={[S.screen, { backgroundColor: D.bg, justifyContent: "center", alignItems: "center", padding: 40 }]}>
        <View style={S.permIcon}>
          <Feather name="camera-off" size={30} color={D.inkSoft} />
        </View>
        <Text style={S.permTitle}>Accès caméra requis</Text>
        <Text style={S.permDesc}>Autorisez l'accès à la caméra pour scanner les QR codes de transfert.</Text>
        <TouchableOpacity style={S.permBtn} onPress={requestPermission}>
          <Text style={S.permBtnTxt}>Autoriser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── QR scan handler ─────────────────────────────────────────────────────────
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const transferData = JSON.parse(data);
      if (transferData.ref && transferData.items) {
        const items = transferData.items.map((item: any) => {
          const product = products.find((p) => p.sku === item.sku);
          return { ...item, name: product?.name || `SKU: ${item.sku}`, price: product?.price || item.price || 0 };
        });
        const newTransfer: Transfer = {
          ...transferData,
          items,
          id: transferData.id?.toString() || Date.now().toString(),
          date: transferData.date || new Date().toISOString(),
          from: transferData.from || "flurryice",
          to: transferData.to || "-",
          total: transferData.total || 0,
          sig: transferData.sig || "",
        };
        const existing = transfers.find((t) => t.ref === newTransfer.ref);
        if (existing) {
          Toast.show(`${t("transfers.alreadyExists")}: ${newTransfer.ref}`, {
            duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.amber,
          });
          return;
        }
        addTransfer(newTransfer);
        Toast.show(`${t("transfers.transfer")} ${newTransfer.ref} ${t("transfers.alreadyExists") ? "enregistré" : "saved"}`, {
          duration: Toast.durations.LONG, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
        });
      } else {
        Toast.show(t("transfers.invalidQRFormat"), { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
      }
    } catch {
      Toast.show(t("transfers.cannotReadQR"), { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
    }
  };

  // ── Transfer-out helpers ────────────────────────────────────────────────────
  const productsWithStock = products.filter((p) => p.stock > 0);

  const handleTransferOutProduct = (productId: string) => {
    const currentQty = transferOutSelection[productId] || 0;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (currentQty >= product.stock) {
      Toast.show(`Max: ${product.stock}`, { duration: 1000, backgroundColor: D.amber });
      return;
    }
    setTransferOutSelection((prev) => ({ ...prev, [productId]: currentQty + 1 }));
  };

  const handleTransferOutQtyChange = (productId: string, newQty: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product || newQty > product.stock || newQty < 0) return;
    if (newQty === 0) {
      const { [productId]: _, ...rest } = transferOutSelection;
      setTransferOutSelection(rest);
    } else {
      setTransferOutSelection((prev) => ({ ...prev, [productId]: newQty }));
    }
  };

  const completeTransferOut = async () => {
    if (Object.keys(transferOutSelection).length === 0) {
      Toast.show(t("transfers.selectProducts"), { duration: 1000, backgroundColor: D.rose });
      return;
    }
    const items = Object.entries(transferOutSelection).map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      const itemPrice = product?.price ?? 0;
      return { productId, sku: product?.sku || "", name: product?.name || `Product ${productId}`, qty: Number(qty), price: itemPrice };
    });
    const total = items.reduce((sum, item) => {
      const itemTotal = (item.qty || 0) * (item.price || 0);
      return sum + itemTotal;
    }, 0);
    const ref = `TR-OUT-${Date.now()}`;
    const newTransfer: Transfer = {
      id: ref, ref, items, date: new Date().toISOString(),
      from: "Flurryice", to: config.truckLocation || "-", total, sig: "",
    };
    await addTransfer(newTransfer);
    setSelectedTransfer(newTransfer);
    setShowTransferOutModal(false);
    setTransferOutSelection({});
    setShowDetailSheet(true);
    Toast.show(t("transfers.transferred"), { duration: 2000, backgroundColor: D.emerald });
  };

  const handleShare = async (item: Transfer) => {
    try {
      const calculatedTotal = item.total || item.items.reduce((sum: number, i: any) => sum + ((i.qty || 0) * (i.price || 0)), 0);
      const message = [
        `Transfert #${item.ref}`,
        `De: ${item.from}  →  À: ${item.to}`,
        `Articles: ${item.items.length}`,
        `Total: MAD ${calculatedTotal.toFixed(2)}`,
        `Date: ${new Date(item.date).toLocaleDateString("fr-FR")}`,
      ].join("\n");
      await Share.share({ message });
    } catch {}
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t("transfers.title")}
          dark
          showMenu
          onMenuPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsSidebarOpen(true); }}
          rightActions={
            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Transfer-out */}
              <TouchableOpacity
                style={S.hBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTransferOutModal(true); }}
                activeOpacity={0.75}
              >
                <Feather name="arrow-up" size={17} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              {/* Scan QR */}
              <TouchableOpacity
                style={S.hBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScanning(true); }}
                activeOpacity={0.75}
              >
                <Feather name="maximize" size={17} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Summary strip */}
        <View style={S.heroStats}>
          {[
            { icon: "swap-horizontal" as any, label: t("transfers.total") || "Total",  value: transfers.length,                                      color: D.heroAccent, bg: D.heroAccent + "28" },
            { icon: "arrow-up-circle"  as any, label: t("transfers.out")   || "Sortie", value: transfers.filter((t) => t.ref.startsWith("TR-OUT")).length, color: D.rose,       bg: D.rose + "28"       },
            { icon: "arrow-down-circle"as any, label: t("transfers.in")    || "Entrée", value: transfers.filter((t) => !t.ref.startsWith("TR-OUT")).length, color: D.emerald,    bg: D.emerald + "28"    },
          ].map((st) => (
            <View key={st.label} style={S.heroStat}>
              <View style={[S.heroStatIcon, { backgroundColor: st.bg }]}>
                <Text style={[S.heroStatNum, { color: st.color }]}>{st.value}</Text>
              </View>
              <Text style={S.heroStatLbl}>{st.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={transfers}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item, index }) => (
          <TransferCard
            item={item}
            index={index}
            onPrint={() => { setSelectedTransfer(item); setShowDetailSheet(true); }}
            onView={() => { setSelectedTransfer(item); setShowDetailSheet(true); }}
            onShare={() => handleShare(item)}
          />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <View style={S.emptyIcon}>
              <MaterialCommunityIcons name="swap-horizontal" size={30} color={D.inkSoft} />
            </View>
            <Text style={S.emptyTitle}>Aucun transfert enregistré</Text>
            <Text style={S.emptyDesc}>Scannez un QR code pour ajouter un transfert</Text>
          </View>
        }
      />

      {/* ── Camera scanner ── */}
      {scanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          >
            <View style={S.camOverlay}>
              <View style={{ flex: 1 }} />
              <View style={S.camMiddle}>
                <View style={{ flex: 1 }} />
                <View style={S.camFocus} />
                <View style={{ flex: 1 }} />
              </View>
              <View style={[{ flex: 1 }, S.camBottom]}>
                <Text style={S.camHint}>Pointez vers le QR code du transfert</Text>
                <TouchableOpacity style={S.camCancel} onPress={() => setScanning(false)}>
                  <Feather name="x" size={18} color="#fff" />
                  <Text style={S.camCancelTxt}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      )}

      {/* ── Detail / Print sheet ── */}
      <Modal visible={showDetailSheet} transparent animationType="slide" onRequestClose={() => setShowDetailSheet(false)}>
        <Pressable style={S.overlay} onPress={() => setShowDetailSheet(false)}>
          <Pressable style={S.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={S.handle} />
            {selectedTransfer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Sheet header */}
                <View style={S.sheetHero}>
                  <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
                  <View style={[S.sheetHeroIcon, { backgroundColor: D.heroAccent + "30" }]}>
                    <MaterialCommunityIcons name="swap-horizontal" size={26} color={D.heroAccent} />
                  </View>
                  <Text style={S.sheetHeroRef}>#{selectedTransfer.ref}</Text>
                  <Text style={S.sheetHeroDate}>
                    {new Date(selectedTransfer.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </Text>
                </View>

                {/* Info card */}
                <View style={S.infoCard}>
                  {[
                    { label: t("transfers.from") || "De",  value: selectedTransfer.from },
                    { label: t("transfers.to")   || "À",   value: selectedTransfer.to   },
                    { label: t("transfers.date") || "Date", value: new Date(selectedTransfer.date).toLocaleDateString("fr-FR") },
                  ].map((row) => (
                    <View key={row.label} style={S.infoRow}>
                      <Text style={S.infoLbl}>{row.label}</Text>
                      <Text style={S.infoVal}>{row.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Items */}
                <Text style={S.sectionLbl}>
                  {t("transfers.items") || "Articles"} ({selectedTransfer.items.length})
                </Text>
                <View style={S.itemsCard}>
                  {selectedTransfer.items.map((item, i) => (
                    <View key={i} style={[S.itemRow, i > 0 && S.itemRowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.itemName}>{item.name || `Article ${i + 1}`}</Text>
                        <Text style={S.itemQtyTxt}>×{item.qty}</Text>
                      </View>
                        <Text style={S.itemPrice}>
                          MAD {(item.qty * (item.price || 0)).toFixed(2)}
                        </Text>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={S.totalRow}>
                  <Text style={S.totalLbl}>{t("transfers.total") || "Total"}</Text>
                  <Text style={S.totalVal}>
                    MAD {selectedTransfer.total || selectedTransfer.items.reduce((sum, item) => sum + (item.qty * (item.price || 0)), 0).toFixed(2)}
                  </Text>
                </View>

                {/* Print button */}
                <TouchableOpacity
                  style={[S.printBtn, (isConnecting || isPrinting) && { opacity: 0.6 }]}
                  onPress={async () => {
                    await printTransfer(selectedTransfer);
                  }}
                  disabled={isConnecting || isPrinting}
                >
                  <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.printBtnInner}>
                    {isConnecting || isPrinting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Feather name="printer" size={17} color="#fff" /><Text style={S.printBtnTxt}>{t("common.print") || "Imprimer"}</Text></>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Share PDF button */}
                <TouchableOpacity
                  style={[S.shareBtn]}
                  onPress={async () => {
                    const uri = await exportTransferPdf(selectedTransfer);
                    if (!uri) {
                      Toast.show("Erreur lors de l'export PDF", { duration: 2000, backgroundColor: D.rose });
                    }
                  }}
                >
                  <View style={S.shareBtnInner}>
                    <Feather name="share" size={17} color={D.heroAccent} />
                    <Text style={S.shareBtnTxt}>Partager PDF</Text>
                  </View>
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity style={S.closeBtn} onPress={() => setShowDetailSheet(false)}>
                  <Text style={S.closeBtnTxt}>{t("common.close") || "Fermer"}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Print overlay ── */}
      <Modal visible={showPrintOverlay} transparent animationType="fade">
        <View style={S.printOverlay}>
          <View style={S.printOverlayCard}>
            <ActivityIndicator size="large" color={D.heroAccent} />
            <Text style={S.printOverlayTxt}>
              {isConnecting ? t("printer.connecting") : t("printer.printing")}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Transfer-out modal ── */}
      <Modal visible={showTransferOutModal} transparent animationType="slide" onRequestClose={() => setShowTransferOutModal(false)}>
        <Pressable style={S.overlay} onPress={() => setShowTransferOutModal(false)}>
          <Pressable style={S.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={S.handle} />
            <Text style={S.sheetTitle}>{t("transfers.transferOut") || "Transfert sortant"}</Text>
            <Text style={S.sheetSubtitle}>
              {productsWithStock.length} {t("products.products") || "produits"} disponibles
            </Text>

            {productsWithStock.length === 0 ? (
              <View style={S.empty}>
                <View style={S.emptyIcon}><Feather name="package" size={28} color={D.inkSoft} /></View>
                <Text style={S.emptyTitle}>Aucun produit en stock</Text>
              </View>
            ) : (
              <FlatList
                data={productsWithStock}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 8 }}
                style={{ maxHeight: 380, marginBottom: 16 }}
                renderItem={({ item }) => {
                  const selectedQty = transferOutSelection[item.id] || 0;
                  return (
                    <View style={[S.outItem, selectedQty > 0 && S.outItemSelected]}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.outItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={S.outItemStock}>Stock: {item.stock}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {selectedQty > 0 && (
                          <>
                            <TouchableOpacity
                              style={[S.qtyBtn, { backgroundColor: D.roseBg, borderColor: D.rose + "40" }]}
                              onPress={() => handleTransferOutQtyChange(item.id, selectedQty - 1)}
                            >
                              <Feather name="minus" size={13} color={D.rose} />
                            </TouchableOpacity>
                            <Text style={S.qtyTxt}>{selectedQty}</Text>
                          </>
                        )}
                        <TouchableOpacity
                          style={[S.qtyBtn, { backgroundColor: selectedQty > 0 ? D.violetBg : D.emeraldBg, borderColor: selectedQty > 0 ? D.heroAccent + "40" : D.emerald + "40" }]}
                          onPress={() => handleTransferOutProduct(item.id)}
                        >
                          <Feather name="plus" size={13} color={selectedQty > 0 ? D.heroAccent : D.emerald} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <TouchableOpacity
              style={[S.completeBtn, Object.keys(transferOutSelection).length === 0 && { opacity: 0.45 }]}
              onPress={completeTransferOut}
              disabled={Object.keys(transferOutSelection).length === 0}
            >
              <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.completeBtnInner}>
                <Feather name="check" size={17} color="#fff" />
                <Text style={S.completeBtnTxt}>
                  {t("common.complete") || "Valider"} — {Object.keys(transferOutSelection).length} art.
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={S.closeBtn} onPress={() => { setShowTransferOutModal(false); setTransferOutSelection({}); }}>
              <Text style={S.closeBtnTxt}>{t("common.cancel") || "Annuler"}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60 },
  blob2: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 10, left: -30 },

  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  heroStats: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, gap: 12,
  },
  heroStat:     { alignItems: "center", flex: 1, gap: 5 },
  heroStatIcon: { width: 52, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  heroStatNum:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroStatLbl:  { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Inter_400Regular" },

  // Transfer card
  card: {
    flexDirection: "row",
    backgroundColor: D.card,
    borderRadius: 18, borderWidth: 1, borderColor: D.border,
    overflow: "hidden",
    elevation: 2,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 10 },
  cardTop:   { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon:  { width: 38, height: 38, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  cardRef:   { fontSize: 14, fontFamily: "Inter_700Bold", color: D.ink },
  cardDate:  { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 1 },
  itemsChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemsChipTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  routeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: D.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: D.border },
  routeTxt:  { fontSize: 11, fontFamily: "Inter_500Medium", color: D.inkMid, maxWidth: 80 },
  totalAmt:  { fontSize: 14, fontFamily: "Inter_700Bold" },

  cardActions: { flexDirection: "row", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: D.border },
  actionBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionTxt:   { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Empty
  empty:     { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: D.surface, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: D.inkMid },
  emptyDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft },

  // Camera
  camOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  camMiddle:  { flexDirection: "row", height: width * 0.68 },
  camFocus:   { width: width * 0.68, borderWidth: 2, borderColor: D.heroAccent, borderRadius: 18 },
  camBottom:  { justifyContent: "flex-end", alignItems: "center", paddingBottom: 100, gap: 16 },
  camHint:    { color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_500Medium" },
  camCancel:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  camCancelTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 36, maxHeight: "88%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: "center", marginBottom: 18 },

  sheetTitle:    { fontSize: 18, fontFamily: "Inter_700Bold", color: D.ink, marginBottom: 2 },
  sheetSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: D.inkSoft, marginBottom: 16 },

  // Sheet hero band
  sheetHero:     { borderRadius: 16, overflow: "hidden", alignItems: "center", paddingVertical: 24, marginBottom: 16 },
  sheetHeroIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  sheetHeroRef:  { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetHeroDate: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  infoCard: { backgroundColor: D.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.border, gap: 10, marginBottom: 18 },
  infoRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLbl:  { fontSize: 13, color: D.inkSoft },
  infoVal:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: D.ink },

  sectionLbl: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.inkSoft, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 },

  itemsCard: { backgroundColor: D.bg, borderRadius: 14, borderWidth: 1, borderColor: D.border, marginBottom: 16, overflow: "hidden" },
  itemRow:      { flexDirection: "row", alignItems: "center", padding: 12 },
  itemRowBorder: { borderTopWidth: 1, borderTopColor: D.border },
  itemName:  { fontSize: 13, fontFamily: "Inter_500Medium", color: D.ink },
  itemQtyTxt:{ fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },
  itemPrice: { fontSize: 13, fontFamily: "Inter_700Bold", color: D.ink },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: D.violetBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: D.borderFocus || D.border, marginBottom: 16 },
  totalLbl: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },
  totalVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: D.heroAccent },

  printBtn:      { borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  printBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50 },
  printBtnTxt:   { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  shareBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 10, borderWidth: 1.5, borderColor: D.heroAccent },
  shareBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: D.surface },
  shareBtnTxt: { color: D.heroAccent, fontSize: 15, fontFamily: "Inter_600SemiBold" },

  closeBtn:    { backgroundColor: D.bg, borderRadius: 14, height: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  closeBtnTxt: { color: D.inkSoft, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Print overlay
  printOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  printOverlayCard: { backgroundColor: D.surface, padding: 32, borderRadius: 20, alignItems: "center", minWidth: 200 },
  printOverlayTxt:  { marginTop: 16, fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },

  // Transfer-out items
  outItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: D.border,
    backgroundColor: D.bg,
  },
  outItemSelected: { borderColor: D.heroAccent + "60", backgroundColor: D.violetBg },
  outItemName:  { fontSize: 14, fontFamily: "Inter_500Medium", color: D.ink },
  outItemStock: { fontSize: 11, fontFamily: "Inter_400Regular", color: D.inkSoft, marginTop: 2 },
  qtyBtn:  { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  qtyTxt:  { fontSize: 14, fontFamily: "Inter_700Bold", color: D.ink, minWidth: 22, textAlign: "center" },

  completeBtn:      { borderRadius: 14, overflow: "hidden", marginBottom: 10 },
  completeBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50 },
  completeBtnTxt:   { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Permission
  permIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: D.bg, justifyContent: "center", alignItems: "center", marginBottom: 18, borderWidth: 1, borderColor: D.border },
  permTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: D.ink, marginBottom: 8 },
  permDesc:  { fontSize: 14, fontFamily: "Inter_400Regular", color: D.inkSoft, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  permBtn:   { borderRadius: 14, overflow: "hidden" },
  permBtnTxt:{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});