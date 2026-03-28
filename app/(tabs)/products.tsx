import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import CustomAlert from "@/components/common/CustomAlert";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/components/common/AppHeader";
import { BrandSettingsModal } from "@/components/BrandSettingsModal";
import { useTranslation } from "react-i18next";
import Toast from "react-native-root-toast";
import { D } from "@/constants/theme";

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, brands, addToCart, cart, removeFromCart, syncData, isSyncing, setIsSidebarOpen, setProducts, updateProduct } = useApp();
  const { t } = useTranslation();

  const [search, setSearch]                           = useState("");
  const [selectedProducts, setSelectedProducts]       = useState<{ [key: string]: number }>({});
  const [viewMode, setViewMode]                       = useState<"grid" | "list">("grid");
  const [showFilterModal, setShowFilterModal]         = useState(false);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory]       = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand]           = useState<string | null>(null);
  const [stockFilter, setStockFilter]                 = useState<"inStock" | "outOfStock" | "all">("inStock");
  const [scanning, setScanning]                       = useState(false);
  const [permission, requestPermission]               = useCameraPermissions();
  const [showSyncSheet, setShowSyncSheet]             = useState(false);
  const [showBrandSettings, setShowBrandSettings]   = useState(false);
  const [bulkEditMode, setBulkEditMode]           = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds]     = useState<Set<string>>(new Set());
  const [showBulkBrandModal, setShowBulkBrandModal] = useState(false);
  const [editProduct, setEditProduct]                 = useState<{ id: string; name: string; price: string; image: string | undefined; brandId?: string } | null>(null);
  const [editPrice, setEditPrice]                     = useState("");
  const [editImage, setEditImage]                     = useState<string | undefined>(undefined);
  const [alertConfig, setAlertConfig]                 = useState<{
    visible: boolean; title: string; message: string; type: "success" | "error" | "info";
  }>({ visible: false, title: "", message: "", type: "info" });

  useEffect(() => {
    AsyncStorage.getItem("@products_view_mode").then((saved) => {
      if (saved === "list" || saved === "grid") setViewMode(saved);
    });
  }, []);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    AsyncStorage.setItem("@products_view_mode", mode);
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Toast.show(t("auth.cameraPermissionRequired") || "Camera permission required", {
          duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose,
        });
        return;
      }
    }
    setScanning(true);
  };

  const handleQRScan = async ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const qrData: { id: number; name?: string; sku: string; price: string }[] = JSON.parse(data);
      if (!Array.isArray(qrData)) {
        Toast.show(t("products.invalidQRCode") || "Invalid QR code format", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
        return;
      }
      let updatedCount = 0, addedCount = 0;
      const newProducts: typeof products = [];
      qrData.forEach((item) => {
        const existing = products.find((p) => String(p.sku) === item.sku || String(p.id) === String(item.id));
        if (existing) {
          const np = parseFloat(item.price);
          if (!isNaN(np) && np !== existing.price) updatedCount++;
        } else {
          addedCount++;
          newProducts.push({ id: String(item.id), name: item.name || item.sku || `Product ${item.id}`, price: parseFloat(item.price) || 0, unit: "piece", category: "Imported", sku: item.sku || String(item.id), stock: 0 });
        }
      });
      const updated = products.map((product) => {
        const qi = qrData.find((p) => String(p.sku) === String(product.sku) || String(p.id) === String(product.id));
        if (qi) { const np = parseFloat(qi.price); if (!isNaN(np)) return { ...product, price: np }; }
        return product;
      });
      const all = [...updated, ...newProducts];
      if (addedCount > 0 || updatedCount > 0) {
        setProducts(all);
        await AsyncStorage.setItem("@bizpos_products", JSON.stringify(all));
        const msg = addedCount > 0 && updatedCount > 0
          ? `${addedCount} ajouté, ${updatedCount} mis à jour`
          : addedCount > 0 ? `${addedCount} produits ajoutés` : `${updatedCount} prix mis à jour`;
        Toast.show(msg, { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Toast.show(t("products.noChanges") || "Aucune modification", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.amber });
      }
    } catch {
      Toast.show(t("products.invalidQRCode") || "QR invalide", { duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose });
    }
  };

  const showAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") =>
    setAlertConfig({ visible: true, title, message, type });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (stockFilter === "inStock" && p.stock <= 0) return false;
      if (stockFilter === "outOfStock" && p.stock > 0) return false;
      if (selectedBrand && p.brandId !== selectedBrand) return false;
      if (!selectedCategory || p.category === selectedCategory) {
        return p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
      }
      return false;
    });
  }, [products, search, selectedCategory, selectedBrand, stockFilter]);

  // ── Edit product ──────────────────────────────────────────────────────────────
  const openEditModal = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditProduct({ id: product.id, name: product.name, price: String(product.price), image: product.image });
    setEditPrice(String(product.price));
    setEditImage(product.image);
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      Toast.show(t("products.invalidPrice") || "Prix invalide", {
        duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.rose,
      });
      return;
    }
    await updateProduct(editProduct.id, { price: newPrice, image: editImage });
    setEditProduct(null);
    Toast.show(t("products.productUpdated") || "Produit mis à jour", {
      duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setEditImage(result.assets[0].uri);
    }
  };

  // ── Bulk edit ─────────────────────────────────────────────────────────────────
  const toggleBulkItem = (id: string) => {
    Haptics.selectionAsync();
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterBulkMode = () => {
    setBulkEditMode(true);
    setBulkSelectedIds(new Set());
  };

  const exitBulkMode = () => {
    setBulkEditMode(false);
    setBulkSelectedIds(new Set());
  };

  const selectAllInFilter = () => {
    Haptics.selectionAsync();
    const ids = filteredProducts.map(p => p.id);
    setBulkSelectedIds(new Set(ids));
  };

  const handleBulkAssignBrand = async (brandId: string) => {
    const ids = Array.from(bulkSelectedIds);
    for (const id of ids) {
      await updateProduct(id, { brandId });
    }
    setShowBulkBrandModal(false);
    exitBulkMode();
    Toast.show(`${ids.length} produit${ids.length > 1 ? "s" : ""} mis à jour`, {
      duration: 2000, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
    });
  };

  // ── Grid card ────────────────────────────────────────────────────────────────
  const renderGridItem = ({ item }: { item: any }) => {
    const isCartSelected = selectedProducts[item.id] !== undefined;
    const isBulkSelected = bulkSelectedIds.has(item.id);
    const selectedQty = selectedProducts[item.id] || 0;
    const isOut = item.stock <= 0;

    const itemBrand = brands.find(b => b.id === item.brandId);

    const handlePress = () => {
      if (bulkEditMode) {
        toggleBulkItem(item.id);
        return;
      }
      if (isOut) { showAlert(t("products.outOfStock"), t("products.outOfStockAlert"), "error"); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedProducts((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      addToCart(item, 1);
    };
    const handleRemove = () => {
      if (selectedProducts[item.id]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        removeFromCart(item.id);
        const { [item.id]: _, ...rest } = selectedProducts;
        setSelectedProducts(rest);
      }
    };
    const handleLongPress = () => {
      if (!bulkEditMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        enterBulkMode();
        toggleBulkItem(item.id);
      }
    };
    const handleEditPress = bulkEditMode ? () => toggleBulkItem(item.id) : () => openEditModal(item);

    return (
      <View style={[S.gridCard, isCartSelected && !bulkEditMode && S.gridCardSelected, isOut && !bulkEditMode && S.cardDisabled]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.82}
          delayLongPress={300}
        >
          <View style={S.gridImgWrap}>
            {item.image
              ? <Image source={{ uri: item.image }} style={S.gridImg} />
              : <View style={S.imgPlaceholder}><Feather name="image" size={24} color={D.inkGhost} /></View>
            }
            {bulkEditMode ? (
              <View style={[S.bulkCheck, isBulkSelected && S.bulkCheckActive]}>
                {isBulkSelected && <Feather name="check" size={13} color="#fff" />}
              </View>
            ) : (
              isCartSelected && <View style={S.checkBadge}><Feather name="check" size={11} color="#fff" /></View>
            )}
            {isOut && !bulkEditMode && <View style={S.outOverlay}><Text style={S.outOverlayTxt}>Rupture</Text></View>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[S.moreBtn, bulkEditMode && { backgroundColor: isBulkSelected ? D.heroAccent : "rgba(255,255,255,0.3)" }]} onPress={handleEditPress}>
          {bulkEditMode ? (
            <Feather name={isBulkSelected ? "check-square" : "square"} size={14} color="#fff" />
          ) : (
            <Feather name="edit-2" size={14} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={S.gridInfo}>
          {itemBrand && (
            <View style={[S.brandPill, { backgroundColor: (itemBrand.color || "#1a3a2a") + "20" }]}>
              <View style={[S.brandPillDot, { backgroundColor: itemBrand.color || "#1a3a2a" }]} />
              <Text style={[S.brandPillTxt, { color: itemBrand.color || "#1a3a2a" }]}>{itemBrand.name}</Text>
            </View>
          )}
          <Text style={S.gridName} numberOfLines={2}>{item.name}</Text>
          <Text style={S.gridPrice}>{fmt(item.price)} <Text style={S.gridCurrency}>MAD</Text></Text>
          <View style={S.gridFooter}>
            <View style={[S.stockPill, { backgroundColor: isOut ? D.roseBg : isCartSelected && !bulkEditMode ? D.emeraldBg : D.blueBg }]}>
              <View style={[S.stockDot, { backgroundColor: isOut ? D.rose : isCartSelected && !bulkEditMode ? D.emerald : D.blue }]} />
              <Text style={[S.stockTxt, { color: isOut ? D.rose : isCartSelected && !bulkEditMode ? D.emerald : D.blue }]}>{fmt(item.stock)}</Text>
            </View>
            {isCartSelected && !bulkEditMode && (
              <View style={S.qtyBadge}><Text style={S.qtyBadgeTxt}>×{selectedQty}</Text></View>
            )}
          </View>
        </View>

        {isCartSelected && !bulkEditMode && (
          <TouchableOpacity style={S.minusBtn} onPress={handleRemove}>
            <Feather name="minus" size={11} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── List item ────────────────────────────────────────────────────────────────
  const renderListItem = ({ item }: { item: any }) => {
    const isCartSelected = selectedProducts[item.id] !== undefined;
    const isBulkSelected = bulkSelectedIds.has(item.id);
    const selectedQty = selectedProducts[item.id] || 0;
    const isOut = item.stock <= 0;
    const itemBrand = brands.find(b => b.id === item.brandId);

    const handlePress = () => {
      if (bulkEditMode) { toggleBulkItem(item.id); return; }
      if (isOut) { showAlert(t("products.outOfStock"), t("products.outOfStockAlert"), "error"); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedProducts((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      addToCart(item, 1);
    };
    const handleRemove = () => {
      if (selectedProducts[item.id]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        removeFromCart(item.id);
        const { [item.id]: _, ...rest } = selectedProducts;
        setSelectedProducts(rest);
      }
    };

    return (
      <TouchableOpacity
        style={[S.listItem, isCartSelected && !bulkEditMode && S.listItemSelected, isOut && !bulkEditMode && S.cardDisabled]}
        onPress={handlePress}
        onLongPress={() => {
          if (!bulkEditMode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            enterBulkMode();
            toggleBulkItem(item.id);
          }
        }}
        activeOpacity={0.82}
        delayLongPress={300}
      >
        {bulkEditMode ? (
          <View style={[S.bulkCheck, S.bulkCheckList, isBulkSelected && S.bulkCheckActive]}>
            {isBulkSelected && <Feather name="check" size={14} color="#fff" />}
          </View>
        ) : (
          isCartSelected && <View style={S.listAccent} />
        )}
        <View style={[S.listImgWrap, (isCartSelected && !bulkEditMode) && { borderColor: D.emerald + "50" }]}>
          {item.image
            ? <Image source={{ uri: item.image }} style={S.listImg} />
            : <View style={S.imgPlaceholder}><Feather name="image" size={18} color={D.inkGhost} /></View>
          }
          {!bulkEditMode && isCartSelected && <View style={S.listCheckBadge}><Feather name="check" size={8} color="#fff" /></View>}
        </View>
        <View style={S.listBody}>
          {itemBrand && (
            <View style={[S.brandPill, { backgroundColor: (itemBrand.color || "#1a3a2a") + "20", alignSelf: "flex-start", marginBottom: 4 }]}>
              <View style={[S.brandPillDot, { backgroundColor: itemBrand.color || "#1a3a2a" }]} />
              <Text style={[S.brandPillTxt, { color: itemBrand.color || "#1a3a2a" }]}>{itemBrand.name}</Text>
            </View>
          )}
          <Text style={S.listName} numberOfLines={1}>{item.name}</Text>
          <Text style={S.listPrice}>{fmt(item.price)} <Text style={S.listCurrency}>MAD</Text></Text>
          <View style={[S.stockPill, { alignSelf: "flex-start", backgroundColor: isOut ? D.roseBg : D.emeraldBg }]}>
            <View style={[S.stockDot, { backgroundColor: isOut ? D.rose : D.emerald }]} />
            <Text style={[S.stockTxt, { color: isOut ? D.rose : D.emerald }]}>
              {fmt(item.stock)} {t("pos.available")}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {!bulkEditMode && (
            <TouchableOpacity style={S.listEditBtn} onPress={() => openEditModal(item)}>
              <Feather name="edit-2" size={13} color={D.heroAccent} />
            </TouchableOpacity>
          )}
          <View style={S.listRight}>
            {bulkEditMode ? null : isCartSelected ? (
              <View style={S.listQtyRow}>
                <TouchableOpacity style={S.listMinusBtn} onPress={handleRemove}>
                  <Feather name="minus" size={11} color="#fff" />
                </TouchableOpacity>
                <Text style={S.listQtyTxt}>{selectedQty}</Text>
              </View>
            ) : !bulkEditMode ? (
              <View style={S.listAddBtn}>
                <Feather name="plus" size={15} color={D.heroAccent} />
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hasSelection = Object.keys(selectedProducts).length > 0;
  const bulkCount = bulkSelectedIds.size;

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Bulk edit bar ── */}
      {bulkEditMode && (
        <View style={[S.bulkBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={S.bulkClose} onPress={exitBulkMode}>
            <Feather name="x" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={S.bulkCount}>{bulkCount} sélectionné{bulkCount > 1 ? "s" : ""}</Text>
          <TouchableOpacity style={[S.bulkAction, !bulkCount && S.bulkActionDisabled]} onPress={selectAllInFilter} disabled={!bulkCount}>
            <Feather name="check-square" size={16} color="#fff" />
            <Text style={S.bulkActionTxt}>Tout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.bulkAction, S.bulkAssignBtn, !bulkCount && S.bulkActionDisabled]}
            onPress={() => setShowBulkBrandModal(true)}
            disabled={!bulkCount}
          >
            <Feather name="tag" size={16} color="#fff" />
            <Text style={S.bulkActionTxt}>Marque</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Hero header ── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t("products.title")}
          dark
          showMenu
          onMenuPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsSidebarOpen(true); }}
          rightActions={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={S.hBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSyncSheet(true); }} disabled={isSyncing}>
                {isSyncing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="refresh-cw" size={17} color="rgba(255,255,255,0.9)" />}
              </TouchableOpacity>
              <TouchableOpacity style={S.hBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/pos/cart"); }}>
                {cart.length > 0 && <View style={S.cartBadge}><Text style={S.cartBadgeTxt}>{cart.length}</Text></View>}
                <Feather name="shopping-cart" size={17} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Toolbar */}
        <View style={S.toolbar}>
          <View style={S.countChip}>
            <Feather name="layers" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={S.countChipTxt}>{products.length} {t("products.products") || "produits"}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={S.viewToggle}>
            <TouchableOpacity style={[S.toggleBtn, viewMode === "grid" && S.toggleActive]} onPress={() => handleViewModeChange("grid")}>
              <Feather name="grid" size={13} color={viewMode === "grid" ? D.heroB : "rgba(255,255,255,0.7)"} />
            </TouchableOpacity>
            <TouchableOpacity style={[S.toggleBtn, viewMode === "list" && S.toggleActive]} onPress={() => handleViewModeChange("list")}>
              <Feather name="list" size={13} color={viewMode === "list" ? D.heroB : "rgba(255,255,255,0.7)"} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[S.filterBtn, (selectedCategory || stockFilter !== "inStock") && S.filterBtnActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Feather name="sliders" size={13} color={(selectedCategory || stockFilter !== "inStock") ? D.heroB : "rgba(255,255,255,0.85)"} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={S.searchWrap}>
          <Feather name="search" size={14} color={D.inkSoft} style={{ marginRight: 8 }} />
          <TextInput
            style={S.searchInput}
            placeholder={t("products.searchPlaceholder")}
            placeholderTextColor={D.inkGhost}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={D.inkSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sync banner */}
      {isSyncing && (
        <View style={S.syncBanner}>
          <ActivityIndicator size="small" color={D.heroAccent} />
          <Text style={S.syncBannerTxt}>Synchronisation en cours…</Text>
        </View>
      )}

      {/* ── Product list ── */}
      <FlatList
        data={filteredProducts}
        renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        extraData={products}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        style={S.list}
        contentContainerStyle={[S.listContent, { paddingBottom: insets.bottom + (hasSelection ? 130 : 24) }]}
        ListEmptyComponent={
          <View style={S.emptyWrap}>
            <View style={S.emptyIcon}><Feather name="package" size={30} color={D.heroAccent} /></View>
            <Text style={S.emptyTitle}>{t("products.noProducts")}</Text>
            <Text style={S.emptyDesc}>Ajoutez ou synchronisez des produits</Text>
          </View>
        }
      />

      {/* ── Bottom selection bar ── */}
      {hasSelection && (
        <View style={[S.bottomBar, { paddingBottom: insets.bottom + 64 }]}>
          <View style={S.selInfo}>
            <Text style={S.selCount}>
              {Object.keys(selectedProducts).length}{" "}
              {Object.keys(selectedProducts).length === 1 ? t("products.product") : t("products.products")}
            </Text>
            <Text style={S.selTotal}>
              {fmt(Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
                const product = products.find((p) => p.id === id);
                return sum + (product ? product.price * qty : 0);
              }, 0))} MAD
            </Text>
          </View>
          <TouchableOpacity style={S.nextBtn} onPress={() => { setSelectedProducts({}); router.push("/pos/cart"); }}>
            <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.nextBtnInner}>
              <Feather name="shopping-cart" size={15} color="#fff" />
              <Text style={S.nextBtnTxt}>{t("common.next") || "Commander"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter Modal ── */}
      <Modal visible={showFilterModal} transparent animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeaderRow}>
              <Text style={S.sheetTitle}>{t("products.filter") || "Filtres"}</Text>
              <TouchableOpacity style={S.sheetClose} onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={16} color={D.inkSoft} />
              </TouchableOpacity>
            </View>
            <Text style={S.sectionLbl}>{t("products.stockStatus") || "Statut du stock"}</Text>
            <View style={S.chipsRow}>
              {([
                { val: "inStock",    label: t("products.inStock") || "En stock",  color: D.emerald, bg: D.emeraldBg, icon: "check-circle" },
                { val: "outOfStock", label: t("products.outOfStock") || "Rupture", color: D.rose,   bg: D.roseBg,   icon: "x-circle" },
                { val: "all",        label: t("products.all") || "Tous",           color: D.blue,   bg: D.blueBg,   icon: "layers" },
              ] as const).map((chip) => (
                <TouchableOpacity
                  key={chip.val}
                  style={[S.chip, stockFilter === chip.val && { borderColor: chip.color, backgroundColor: chip.bg }]}
                  onPress={() => setStockFilter(chip.val)}
                >
                  <Feather name={chip.icon as any} size={13} color={stockFilter === chip.val ? chip.color : D.inkGhost} />
                  <Text style={[S.chipTxt, stockFilter === chip.val && { color: chip.color }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={S.brandFilterHeader}>
              <Text style={S.sectionLbl}>{t("products.brand") || "Marque"}</Text>
              <TouchableOpacity onPress={() => { setShowFilterModal(false); setShowBrandSettings(true); }}>
                <Feather name="settings" size={16} color={D.inkSoft} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.brandScroll}>
              <TouchableOpacity
                style={[S.chip, !selectedBrand && S.chipActiveAll]}
                onPress={() => setSelectedBrand(null)}
              >
                <Text style={[S.chipTxt, !selectedBrand && { color: D.heroAccent }]}>Toutes</Text>
              </TouchableOpacity>
              {brands.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[S.chip, selectedBrand === b.id && S.chipActiveAll, { borderColor: selectedBrand === b.id ? (b.color || D.heroAccent) : D.border }]}
                  onPress={() => setSelectedBrand(b.id)}
                >
                  <View style={[S.brandDot, { backgroundColor: b.color || D.heroAccent }]} />
                  <Text style={[S.chipTxt, selectedBrand === b.id && { color: b.color || D.heroAccent }]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={S.applyBtn} onPress={() => setShowFilterModal(false)}>
              <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.applyInner}>
                <Text style={S.applyTxt}>{t("common.apply") || "Appliquer"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Reset Modal ── */}
      <Modal visible={isResetModalVisible} transparent animationType="fade" onRequestClose={() => setIsResetModalVisible(false)}>
        <View style={S.overlay}>
          <View style={[S.sheet, { alignItems: "center" }]}>
            <View style={S.handle} />
            <View style={S.dangerCircle}><Feather name="trash-2" size={26} color={D.rose} /></View>
            <Text style={[S.sheetTitle, { marginBottom: 8 }]}>{t("products.dropProducts") || "Supprimer tout"}</Text>
            <Text style={S.sheetDesc}>{t("products.dropConfirm") || "Supprimer tous les produits de la base locale ?"}</Text>
            <View style={S.btnRow}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setIsResetModalVisible(false)}>
                <Text style={S.cancelTxt}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.dangerBtn}
                onPress={async () => {
                  setProducts([]);
                  await AsyncStorage.setItem("@bizpos_products", JSON.stringify([]));
                  setIsResetModalVisible(false);
                  Toast.show(t("products.droppedSuccess") || "Tous les produits supprimés", {
                    duration: Toast.durations.SHORT, position: Toast.positions.BOTTOM, backgroundColor: D.emerald,
                  });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Text style={S.dangerTxt}>{t("products.dropProducts") || "Supprimer"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Camera ── */}
      <Modal visible={scanning} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={handleQRScan} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
          <TouchableOpacity style={S.closeCam} onPress={() => setScanning(false)}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={S.camOverlay}>
            <Text style={S.camTxt}>{t("products.scanQRCode") || "Scanner le QR des prix"}</Text>
          </View>
        </View>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal visible={editProduct !== null} transparent animationType="slide" onRequestClose={() => setEditProduct(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditProduct(null)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
          </Pressable>
          <View style={S.editSheet}>
            <View style={S.handle} />
            <View style={S.editHeader}>
              <Text style={S.sheetTitle}>{t("products.editProduct") || "Modifier le produit"}</Text>
              <TouchableOpacity onPress={() => setEditProduct(null)}>
                <Feather name="x" size={20} color={D.ink} />
              </TouchableOpacity>
            </View>

            {editProduct && (
              <>
                <TouchableOpacity style={S.imagePickerWrap} onPress={pickImage}>
                  {editImage ? (
                    <Image source={{ uri: editImage }} style={S.imagePreview} />
                  ) : (
                    <View style={S.imagePlaceholder}>
                      <Feather name="camera" size={32} color={D.inkSoft} />
                      <Text style={S.imagePlaceholderTxt}>{t("products.changeImage") || "Changer l'image"}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={S.inputLabel}>{editProduct.name}</Text>

                <Text style={[S.inputLabel, { marginTop: 16 }]}>{t("products.price") || "Prix"} (MAD)</Text>
                <View style={S.priceInputWrap}>
                  <TextInput
                    style={S.priceInput}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={D.inkGhost}
                  />
                </View>

                <TouchableOpacity style={S.saveBtn} onPress={handleSaveEdit}>
                  <Text style={S.saveBtnTxt}>{t("common.save") || "Enregistrer"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Sync sheet ── */}
      <Modal visible={showSyncSheet} transparent animationType="slide" onRequestClose={() => setShowSyncSheet(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSyncSheet(false)}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} />
          </Pressable>
          <View style={S.syncSheet}>
            <View style={S.handle} />
            <Text style={[S.sheetTitle, { marginBottom: 20 }]}>{t("products.syncOptions") || "Options de sync"}</Text>
            {[
              { icon: "cloud",    color: D.blue,   bg: D.blueBg,    label: t("products.syncSupabase") || "Sync depuis le serveur", desc: t("products.syncSupabaseDesc") || "Produits, contacts et ventes", onPress: () => { setShowSyncSheet(false); syncData(); }, disabled: isSyncing },
              { icon: "maximize", color: D.emerald, bg: D.emeraldBg, label: t("products.syncQRCode") || "Scanner QR Prix",          desc: t("products.syncQRCodeDesc") || "Mettre à jour les prix",         onPress: () => { setShowSyncSheet(false); startScanning(); }, disabled: false },
              { icon: "trash-2",  color: D.rose,   bg: D.roseBg,    label: t("products.dropProducts") || "Supprimer tout",         desc: t("products.dropProductsDesc") || "Vider la base locale",         onPress: () => { setShowSyncSheet(false); setIsResetModalVisible(true); }, disabled: false },
            ].map((opt, i) => (
              <TouchableOpacity key={i} style={S.syncOpt} onPress={opt.onPress} disabled={opt.disabled}>
                <View style={[S.syncOptIcon, { backgroundColor: opt.bg }]}>
                  <Feather name={opt.icon as any} size={20} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.syncOptLabel}>{opt.label}</Text>
                  <Text style={S.syncOptDesc}>{opt.desc}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={D.inkGhost} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      <BrandSettingsModal
        visible={showBrandSettings}
        onClose={() => setShowBrandSettings(false)}
      />

      {/* ── Bulk brand picker ── */}
      <Modal visible={showBulkBrandModal} transparent animationType="fade" onRequestClose={() => setShowBulkBrandModal(false)}>
        <View style={S.overlay}>
          <View style={S.bulkBrandSheet}>
            <View style={S.handle} />
            <View style={S.sheetHeaderRow}>
              <Text style={S.sheetTitle}>Assigner une marque</Text>
              <TouchableOpacity onPress={() => setShowBulkBrandModal(false)}>
                <Feather name="x" size={18} color={D.inkSoft} />
              </TouchableOpacity>
            </View>
            <Text style={S.bulkBrandDesc}>
              {bulkCount} produit{bulkCount > 1 ? "s" : ""} sélectionné{bulkCount > 1 ? "s" : ""}
            </Text>
            <View style={S.bulkBrandList}>
              {brands.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={S.bulkBrandRow}
                  onPress={() => handleBulkAssignBrand(b.id)}
                >
                  <View style={[S.bulkBrandColor, { backgroundColor: b.color || "#1a3a2a" }]} />
                  <Text style={S.bulkBrandName}>{b.name}</Text>
                  <Feather name="chevron-right" size={16} color={D.inkGhost} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setShowBulkBrandModal(false)}>
              <Text style={S.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },

  hero: { overflow: "hidden" },
  blob1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60 },
  blob2: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 10, left: -30 },

  hBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  cartBadge: { position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: D.rose, justifyContent: "center", alignItems: "center", zIndex: 1 },
  cartBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },

  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8 },
  countChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countChipTxt: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  viewToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 9, overflow: "hidden" },
  toggleBtn: { padding: 7 },
  toggleActive: { backgroundColor: "#fff" },
  filterBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center", alignItems: "center" },
  filterBtnActive: { backgroundColor: "#fff" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, height: 42, marginHorizontal: 16, marginBottom: 14 },
  searchInput: { flex: 1, color: D.ink, fontSize: 14, fontFamily: "Inter_400Regular" },

  syncBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, backgroundColor: D.violetBg, borderBottomWidth: 1, borderBottomColor: D.borderFocus },
  syncBannerTxt: { color: D.heroAccent, fontSize: 13, fontFamily: "Inter_500Medium" },

  list: { flex: 1 },
  listContent: { padding: 12 },

  // Grid
  gridCard: { flex: 1, margin: 5, backgroundColor: D.card, borderRadius: 18, borderWidth: 1, borderColor: D.border, overflow: "hidden", elevation: 2, shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
  gridCardSelected: { borderColor: D.emerald, borderWidth: 2 },
  cardDisabled: { opacity: 0.45 },
  gridImgWrap: { width: "100%", aspectRatio: 1, backgroundColor: D.bg, justifyContent: "center", alignItems: "center", overflow: "visible" },
  gridImg: { width: "100%", height: "100%", resizeMode: "cover" },
  imgPlaceholder: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center", backgroundColor: D.bg },
  checkBadge: { position: "absolute", top: 7, right: 7, width: 20, height: 20, borderRadius: 10, backgroundColor: D.emerald, justifyContent: "center", alignItems: "center" },
  outOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: D.rose + "E0", paddingVertical: 3, alignItems: "center" },
  outOverlayTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  moreBtn: { position: "absolute", top: -4, right: -4, width: 32, height: 32, borderRadius: 10, backgroundColor: D.heroAccent, justifyContent: "center", alignItems: "center", zIndex: 10, elevation: 4 },
  gridInfo: { padding: 10, gap: 4 },
  gridName: { color: D.ink, fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 17, marginBottom: 2 },
  gridPrice: { color: D.heroAccent, fontSize: 16, fontFamily: "Inter_700Bold" },
  gridCurrency: { fontSize: 10, color: D.inkSoft, fontFamily: "Inter_400Regular" },
  gridFooter: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 },
  stockPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  stockDot: { width: 5, height: 5, borderRadius: 3 },
  stockTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  qtyBadge: { backgroundColor: D.violetBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  qtyBadgeTxt: { color: D.heroAccent, fontSize: 11, fontFamily: "Inter_700Bold" },
  minusBtn: { position: "absolute", bottom: 9, right: 9, width: 24, height: 24, borderRadius: 12, backgroundColor: D.rose, justifyContent: "center", alignItems: "center", elevation: 3 },

  // List
  listItem: { flexDirection: "row", alignItems: "center", backgroundColor: D.card, borderRadius: 16, borderWidth: 1, borderColor: D.border, padding: 12, marginBottom: 8, overflow: "hidden", elevation: 1, shadowColor: D.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3 },
  listItemSelected: { borderColor: D.emerald, borderWidth: 2 },
  listAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: D.emerald },
  listImgWrap: { width: 52, height: 52, borderRadius: 12, backgroundColor: D.bg, overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: D.border },
  listImg: { width: "100%", height: "100%", resizeMode: "cover" },
  listCheckBadge: { position: "absolute", top: 0, right: 0, width: 16, height: 16, borderBottomLeftRadius: 7, backgroundColor: D.emerald, justifyContent: "center", alignItems: "center" },
  listBody: { flex: 1, marginLeft: 12, gap: 3 },
  listName: { color: D.ink, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listPrice: { color: D.heroAccent, fontSize: 14, fontFamily: "Inter_700Bold" },
  listCurrency: { fontSize: 10, color: D.inkSoft },
  listRight: { marginLeft: 10 },
  listQtyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  listMinusBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: D.rose, justifyContent: "center", alignItems: "center" },
  listQtyTxt: { color: D.ink, fontSize: 14, fontFamily: "Inter_700Bold" },
  listAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: D.violetBg, borderWidth: 1, borderColor: D.borderFocus, justifyContent: "center", alignItems: "center" },
  listEditBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: D.violetBg, borderWidth: 1, borderColor: D.borderFocus, justifyContent: "center", alignItems: "center" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: D.violetBg, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle: { color: D.ink, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { color: D.inkSoft, fontSize: 13 },

  // Bottom bar
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, gap: 12, backgroundColor: D.surface, borderTopWidth: 1, borderTopColor: D.border, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 8 },
  selInfo: { flex: 1, backgroundColor: D.bg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: D.border },
  selCount: { color: D.inkSoft, fontSize: 11, fontFamily: "Inter_400Regular" },
  selTotal: { color: D.emerald, fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  nextBtn: { borderRadius: 14, overflow: "hidden" },
  nextBtnInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 20 },
  nextBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: D.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: "center", marginBottom: 20 },
  sheetHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle: { color: D.ink, fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: D.bg, justifyContent: "center", alignItems: "center" },
  sectionLbl: { color: D.inkSoft, fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  chipsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, borderRadius: 12, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border,marginRight: 12  },
  chipTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: D.inkSoft },
  applyBtn: { borderRadius: 14, overflow: "hidden" },
  applyInner: { height: 50, justifyContent: "center", alignItems: "center" },
  applyTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  dangerCircle: { width: 60, height: 60, borderRadius: 18, backgroundColor: D.roseBg, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  sheetDesc: { color: D.inkSoft, fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: { flex: 1, height: 48, borderRadius: 13, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, justifyContent: "center", alignItems: "center" },
  cancelTxt: { color: D.inkSoft, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dangerBtn: { flex: 1, height: 48, borderRadius: 13, backgroundColor: D.rose, justifyContent: "center", alignItems: "center" },
  dangerTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  closeCam: { position: "absolute", top: 50, right: 20, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center" },
  camOverlay: { position: "absolute", bottom: 100, left: 0, right: 0, alignItems: "center" },
  camTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22 },

  syncSheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderColor: D.border },
  syncOpt: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  syncOptIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  syncOptLabel: { color: D.ink, fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  syncOptDesc: { color: D.inkSoft, fontSize: 12 },

  // Edit Product Modal
  editSheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40 },
  editHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  imagePickerWrap: { alignSelf: "center", marginBottom: 16 },
  imagePreview: { width: 120, height: 120, borderRadius: 16 },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 16, backgroundColor: D.bg, borderWidth: 2, borderColor: D.border, borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
  imagePlaceholderTxt: { fontSize: 11, color: D.inkSoft, marginTop: 4, textAlign: "center" },
  inputLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: D.inkSoft, marginBottom: 8 },
  priceInputWrap: { backgroundColor: D.bg, borderRadius: 12, borderWidth: 1, borderColor: D.border, paddingHorizontal: 16, height: 50, justifyContent: "center" },
  priceInput: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: D.ink },
  saveBtn: { backgroundColor: D.heroAccent, borderRadius: 14, height: 50, justifyContent: "center", alignItems: "center", marginTop: 24 },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  brandFilterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  brandScroll: { marginBottom: 12 },
  chipActiveAll: { borderColor: D.heroAccent, borderWidth: 1.5, backgroundColor: D.heroAccent + "15",marginRight: 12 ,padding: 4 },
  brandDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 ,padding: 4 },

  // Bulk edit
  bulkBar: {
    backgroundColor: D.heroA,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  bulkClose: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  bulkCount: { flex: 1, color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bulkAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  bulkActionDisabled: { opacity: 0.4 },
  bulkAssignBtn: { backgroundColor: D.heroAccent },
  bulkActionTxt: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bulkCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bulkCheckActive: { backgroundColor: D.heroAccent, borderColor: D.heroAccent },
  bulkCheckList: { marginRight: 12 },
  brandPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  brandPillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  brandPillTxt: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  // Bulk brand sheet
  bulkBrandSheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 40 },
  bulkBrandDesc: { color: D.inkSoft, fontSize: 14, textAlign: "center", marginBottom: 16 },
  bulkBrandList: { gap: 8, marginBottom: 16 },
  bulkBrandRow: { flexDirection: "row", alignItems: "center", backgroundColor: D.bg, padding: 14, borderRadius: 12, gap: 12 },
  bulkBrandColor: { width: 14, height: 14, borderRadius: 7 },
  bulkBrandName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: D.ink },
});