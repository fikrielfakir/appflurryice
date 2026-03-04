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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { AlertModal } from "@/components/AlertModal";

const C = Colors.dark;

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, addToCart, cart, syncData, isSyncing, resetAllStock, userProfile } = useApp();
  const [search, setSearch] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const handleResetStock = () => {
    if (password === userProfile?.password) {
      resetAllStock();
      setIsResetModalVisible(false);
      setPassword("");
      showAlert("Succès", "Tous les stocks ont été réinitialisés à 0.", "success");
    } else {
      showAlert("Erreur", "Mot de passe incorrect.", "error");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.productCard, item.stock <= 0 && styles.productCardDisabled]} 
      onPress={() => {
        if (item.stock <= 0) {
          showAlert("Indisponible", "Ce produit est en rupture de stock.", "warning");
          return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addToCart(item, 1);
      }}
    >
      <View style={styles.productMain}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>{fmt(item.price)} MAD</Text>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>{fmt(item.stock)}</Text>
            <Feather name="package" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </View>
        </View>

        <View style={styles.productCenter}>
          <Text style={styles.productName}>{item.name}</Text>
        </View>

        <View style={styles.imageContainer}>
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
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeftPlaceholder} />
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Produits finis</Text>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                syncData();
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={C.textSecondary} />
              ) : (
                <Feather name="cloud" size={18} color={C.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity 
              style={styles.cartBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsResetModalVisible(true);
              }}
            >
              <Feather name="refresh-cw" size={20} color={C.danger} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cartBtn} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/pos/cart");
              }}
            >
               {cart.length > 0 && (
                 <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cart.length}</Text>
                 </View>
               )}
               <Feather name="shopping-cart" size={24} color={C.gold} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.actionButtons}>
             <TouchableOpacity style={styles.actionIconBtn}>
                <Feather name="grid" size={18} color={C.gold} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.actionIconBtn}>
                <Feather name="list" size={18} color={C.textSecondary} />
             </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
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
        <View style={styles.syncIndicator}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.syncIndicatorText}>Synchronisation en cours...</Text>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={C.textMuted} />
            <Text style={styles.emptyText}>No products found</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset All Stock</Text>
            <Text style={styles.modalSubtitle}>Enter your password to confirm resetting all product quantities to 0.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: C.card }]}
                onPress={() => {
                  setIsResetModalVisible(false);
                  setPassword("");
                }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
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

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  syncIndicatorText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeftPlaceholder: {
    width: 44, // Space for the floating menu button in layout
  },
  cartBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: C.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderWidth: 2,
    borderColor: C.surface,
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
    color: "#fff",
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
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  listContent: { padding: 12 },
  productCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
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
    color: "#fff",
    marginBottom: 4,
  },
  stockBadge: {
    backgroundColor: "#A01B5D",
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
    color: "#fff",
    textAlign: "center",
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
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
    color: C.textMuted,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: C.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});

