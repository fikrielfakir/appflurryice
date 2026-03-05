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
  const { products, addToCart, cart, syncData, isSyncing, resetAllStock, userProfile, setIsSidebarOpen } = useApp();
  const C = Colors;
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [password, setPassword] = useState("");

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
      showAlert("Success", "All stock has been reset to 0.", "success");
    } else {
      showAlert("Error", "Incorrect password.", "error");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[productCardStyle(C), item.stock <= 0 && styles.productCardDisabled]}
      onPress={() => {
        if (item.stock <= 0) {
          showAlert("Indisponible", "Ce produit est en rupture de stock.", "error");
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addToCart(item, 1);
      }}
    >
      <View style={styles.productMain}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceValue, { color: C.primary }]}>{fmt(item.price)} MAD</Text>
          <View style={[styles.stockBadge, { backgroundColor: C.primary }]}>
            <Text style={styles.stockText}>{fmt(item.stock)}</Text>
            <Feather name="package" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={styles.productCenter}>
          <Text style={[styles.productName, { color: C.text }]}>{item.name}</Text>
        </View>

        <View style={[styles.imageContainer, { backgroundColor: C.background, borderColor: C.border }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Feather name="image" size={20} color={C.textMuted} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
            <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="grid" size={18} color={C.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Feather name="list" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Feather name="search" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="Search..."
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
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>No products found</Text>
          </View>
        }
      />

      <Modal
        visible={isResetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Reset All Stock</Text>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              Enter your password to confirm resetting all product quantities to 0.
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: C.surface, color: C.textPrimary, borderColor: C.border }]}
              placeholder="Password"
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
                <Text style={[styles.modalBtnText, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.danger }]}
                onPress={handleResetStock}
              >
                <Text style={styles.modalBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>
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
  cartBtnHeader: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
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
});