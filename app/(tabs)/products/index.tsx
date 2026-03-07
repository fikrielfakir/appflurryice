import React, { useState, useMemo } from "react";
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
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import { Colors } from "@/constants";
import CustomAlert from "@/components/common/CustomAlert";
import { LinearGradient } from "expo-linear-gradient";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const headerStyle = (C: any): ViewStyle => ({
  paddingHorizontal: 16,
  paddingBottom: 16,
  backgroundColor: C.surface,
  borderBottomWidth: 1,
  borderBottomColor: C.border,
});

const productCardStyle = (C: any): ViewStyle => ({
  backgroundColor: C.card,
  borderRadius: 16,
  padding: 12,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: C.border,
  elevation: 2,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
});

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, addToCart, cart, removeFromCart, syncData, isSyncing, resetAllStock, userProfile, setIsSidebarOpen, setProducts } = useApp();
  const C = Colors;
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: number}>({});
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"inStock" | "outOfStock" | "all">("inStock");

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleResetStock = () => {
    if (password === userProfile?.password) {
      resetAllStock();
      setIsResetModalVisible(false);
      setPassword("");
      showAlert(t('common.success'), t('products.resetSuccess'), "success");
    } else {
      showAlert(t('common.error'), t('products.incorrectPassword'), "error");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) => {
        if (stockFilter === "inStock" && p.stock <= 0) return false;
        if (stockFilter === "outOfStock" && p.stock > 0) return false;
        if (!selectedCategory || p.category === selectedCategory) {
          return p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase());
        }
        return false;
      }
    );
  }, [products, search, selectedCategory, stockFilter]);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const renderGridItem = ({ item }: { item: any }) => {
    const isSelected = selectedProducts[item.id] !== undefined;
    const selectedQty = selectedProducts[item.id] || 0;
    
    const handlePress = () => {
      if (item.stock <= 0) {
        showAlert(t('products.outOfStock'), t('products.outOfStockAlert'), "error");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const newQty = (selectedProducts[item.id] || 0) + 1;
      setSelectedProducts(prev => ({
        ...prev,
        [item.id]: newQty
      }));
      
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
      style={[
        productCardStyle(C), 
        item.stock <= 0 && styles.productCardDisabled,
        isSelected && styles.productCardSelected
      ]}
      onPress={handlePress}
    >
      <View style={styles.productMain}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceValue, { color: C.primary }]}>{fmt(item.price)} MAD</Text>
          <View style={[styles.stockBadge, { backgroundColor: isSelected ? C.success : C.primary }]}>
            <Text style={styles.stockText}>{fmt(item.stock)}</Text>
            <Feather name="package" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={styles.productCenter}>
          <Text style={[styles.productName, { color: C.text }]} numberOfLines={2}>{item.name}</Text>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: C.success }]}>
              <Text style={styles.selectedBadgeText}>{selectedQty} {t('products.selected')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.imageContainer, { backgroundColor: C.background, borderColor: C.border }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name="image" size={20} color={C.textMuted} />
            </View>
          )}
          {isSelected && (
            <View style={[styles.checkmarkOverlay, { backgroundColor: C.success }]}>
              <Feather name="check" size={16} color="#fff" />
            </View>
          )}
        </View>
      </View>
      
      {isSelected && (
        <TouchableOpacity
          style={[styles.decrementBtn, { backgroundColor: C.danger }]}
          onPress={handleRemove}
        >
          <Feather name="minus" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
  };

  const renderListItem = ({ item }: { item: any }) => {
    const isSelected = selectedProducts[item.id] !== undefined;
    const selectedQty = selectedProducts[item.id] || 0;
    
    const handlePress = () => {
      if (item.stock <= 0) {
        showAlert(t('products.outOfStock'), t('products.outOfStockAlert'), "error");
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const newQty = (selectedProducts[item.id] || 0) + 1;
      setSelectedProducts(prev => ({
        ...prev,
        [item.id]: newQty
      }));
      
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
        style={[
          styles.listItem,
          { backgroundColor: C.card, borderColor: C.border },
          item.stock <= 0 && styles.productCardDisabled,
          isSelected && styles.productCardSelected
        ]}
        onPress={handlePress}
      >
        <View style={[styles.listItemImage, { backgroundColor: C.background, borderColor: C.border }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listProductImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name="image" size={24} color={C.textMuted} />
            </View>
          )}
          {isSelected && (
            <View style={[styles.checkmarkOverlay, { backgroundColor: C.success }]}>
              <Feather name="check" size={14} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.listItemContent}>
          <Text style={[styles.listItemName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.listItemPrice, { color: C.primary }]}>{fmt(item.price)} MAD</Text>
          <View style={[styles.listItemStockBadge, { backgroundColor: item.stock > 0 ? C.success : C.danger }]}>
            <Text style={styles.listItemStockText}>{fmt(item.stock)} {t('pos.available')}</Text>
          </View>
        </View>
        
        <View style={styles.listItemActions}>
          <View style={styles.listItemQty}>
            {isSelected ? (
              <>
                <TouchableOpacity
                  style={[styles.listItemQtyBtn, { backgroundColor: C.danger }]}
                  onPress={handleRemove}
                >
                  <Feather name="minus" size={14} color="#fff" />
                </TouchableOpacity>
                <Text style={[styles.listItemQtyText, { color: C.text }]}>{selectedQty}</Text>
              </>
            ) : (
              <Text style={[styles.listItemAddText, { color: C.textSecondary }]}>+</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={[C.accent, C.surface]} style={styles.screen}>
      <AppHeader 
        title={t('products.title')}
        dark
        showMenu
        onMenuPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsSidebarOpen(true);
        }}
        rightActions={
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                syncData();
              }}
              disabled={isSyncing}
              style={[styles.cartBtnHeader, { backgroundColor: 'transparent' }]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="cloud" size={20} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cartBtnHeader, { backgroundColor: C.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsResetModalVisible(true);
              }}
            >
              <Feather name="refresh-cw" size={20} color={C.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cartBtnHeader, { backgroundColor: C.surface }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/pos/cart");
              }}
            >
              {cart.length > 0 && (
                <View style={[styles.cartBadge, { backgroundColor: C.danger, borderColor: C.surface }]}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
              <Feather name="shopping-cart" size={20} color={C.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={[styles.headerActionsWrapper, { backgroundColor: C.primary }]}>
        <View style={styles.headerActions}>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[
                styles.actionIconBtn, 
                { backgroundColor: viewMode === "grid" ? C.accent : C.surface, borderColor: C.border }
              ]}
              onPress={() => setViewMode("grid")}
            >
              <Feather name="grid" size={18} color={viewMode === "grid" ? "#fff" : C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.actionIconBtn, 
                { backgroundColor: viewMode === "list" ? C.accent : C.surface, borderColor: C.border }
              ]}
              onPress={() => setViewMode("list")}
            >
              <Feather name="list" size={18} color={viewMode === "list" ? "#fff" : C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.actionIconBtn, 
                { backgroundColor: (selectedCategory || stockFilter !== "inStock") ? C.success : C.surface, borderColor: C.border }
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Feather name="filter" size={18} color={(selectedCategory || stockFilter !== "inStock") ? "#fff" : C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="search" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder={t('products.searchPlaceholder')}
              placeholderTextColor={C.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {isSyncing && (
        <View style={[styles.syncIndicator, { backgroundColor: C.accent }]}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncIndicatorText}>Synchronisation en cours...</Text>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === "grid" ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + (Object.keys(selectedProducts).length > 0 ? 100 : 100) }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t('products.noProducts')}</Text>
          </View>
        }
      />

      {Object.keys(selectedProducts).length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 60 }]}>
          <View style={[styles.selectedInfo, { backgroundColor: C.surface }]}>
            <Text style={[styles.selectedCount, { color: C.text }]}>
              {Object.keys(selectedProducts).length} {Object.keys(selectedProducts).length === 1 ? t('products.product') : t('products.products')} 
            </Text>
            <Text style={[styles.selectedTotal, { color: C.success }]}>
              {fmt(Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
                const product = products.find(p => p.id === id);
                return sum + (product ? product.price * qty : 0);
              }, 0))} MAD
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: C.primary }]}
            onPress={() => {
              setSelectedProducts({});
              router.push("/pos/cart");
            }}
          >
            <Feather name="shopping-cart" size={18} color="#fff" />
            <Text style={styles.nextBtnText}>{t('common.next') || 'Next'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('products.resetStock')}</Text>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              {t('products.resetConfirm')}
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: C.surface, color: C.textPrimary, borderColor: C.border }]}
              placeholder={t('auth.password')}
              placeholderTextColor={C.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.border }]}
                onPress={() => {
                  setIsResetModalVisible(false);
                  setPassword("");
                }}
              >
                <Text style={[styles.modalBtnText, { color: C.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.danger }]}
                onPress={handleResetStock}
              >
                <Text style={styles.modalBtnText}>{t('products.resetStock')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('products.filter') || 'Filter'}</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.filterSectionTitle, { color: C.textSecondary }]}>{t('products.stockStatus') || 'Stock Status'}</Text>
            
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: stockFilter === "inStock" ? C.success : C.background, borderColor: stockFilter === "inStock" ? C.success : C.border }
                ]}
                onPress={() => setStockFilter("inStock")}
              >
                <Feather name="package" size={14} color={stockFilter === "inStock" ? "#fff" : C.text} />
                <Text style={[styles.filterChipText, { color: stockFilter === "inStock" ? "#fff" : C.text }]}>
                  {t('products.inStock') || 'In Stock'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: stockFilter === "outOfStock" ? C.danger : C.background, borderColor: stockFilter === "outOfStock" ? C.danger : C.border }
                ]}
                onPress={() => setStockFilter("outOfStock")}
              >
                <Feather name="package" size={14} color={stockFilter === "outOfStock" ? "#fff" : C.danger} />
                <Text style={[styles.filterChipText, { color: stockFilter === "outOfStock" ? "#fff" : C.danger }]}>
                  {t('products.outOfStock') || 'Out of Stock'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: stockFilter === "all" ? C.primary : C.background, borderColor: stockFilter === "all" ? C.primary : C.border }
                ]}
                onPress={() => setStockFilter("all")}
              >
                <Feather name="layers" size={14} color={stockFilter === "all" ? "#fff" : C.text} />
                <Text style={[styles.filterChipText, { color: stockFilter === "all" ? "#fff" : C.text }]}>
                  {t('products.all') || 'All'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.filterSectionTitle, { color: C.textSecondary, marginTop: 16 }]}>{t('products.category') || 'Category'}</Text>
            
            <TouchableOpacity
              style={[
                styles.filterOption,
                { backgroundColor: !selectedCategory ? C.primary + '20' : C.background, borderColor: !selectedCategory ? C.primary : C.border }
              ]}
              onPress={() => {
                setSelectedCategory(null);
              }}
            >
              <Text style={[styles.filterOptionText, { color: !selectedCategory ? C.primary : C.text }]}>
                {t('products.allCategories') || 'All Categories'}
              </Text>
              {!selectedCategory && <Feather name="check" size={18} color={C.primary} />}
            </TouchableOpacity>
            
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterOption,
                  { backgroundColor: selectedCategory === cat ? C.primary + '20' : C.background, borderColor: selectedCategory === cat ? C.primary : C.border }
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                }}
              >
                <Text style={[styles.filterOptionText, { color: selectedCategory === cat ? C.primary : C.text }]}>
                  {cat}
                </Text>
                {selectedCategory === cat && <Feather name="check" size={18} color={C.primary} />}
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: C.primary, marginTop: 16 }]}
              onPress={() => {
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.modalBtnText}>{t('common.apply') || 'Apply'}</Text>
            </TouchableOpacity>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActionsWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cartBtnHeader: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncIndicatorText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeftPlaceholder: {
    width: 44,
  },
  cartBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderWidth: 2,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerSubtitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  listContent: { padding: 12 },
  productCardDisabled: {
    opacity: 0.6,
  },
  productCardSelected: {
    borderColor: Colors.success,
    borderWidth: 2,
  },
  selectedBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  checkmarkOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderBottomLeftRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  decrementBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedInfo: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  selectedCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  selectedTotal: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  productMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceContainer: {
    alignItems: "flex-start",
    width: 100,
  },
  priceValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  productCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  productName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  listItemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  listProductImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  listItemPrice: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  listItemStockBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listItemStockText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  listItemActions: {
    marginLeft: 8,
  },
  listItemQty: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  listItemQtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemQtyText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  listItemAddText: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  filterSectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});