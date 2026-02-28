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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { products, addToCart, cart } = useApp();
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addToCart(item, 1);
      }}
    >
      <View style={styles.productMain}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>{fmt(item.price)}MAD</Text>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>{fmt(item.stock)}</Text>
            <MaterialIcons name="Layers" size={12} color="#fff" style={{ marginLeft: 4 }} />
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
          <TouchableOpacity style={styles.cartBtn} onPress={() => {}}>
             <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
             </View>
             <Feather name="shopping-cart" size={24} color={C.primary} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>Produits finis</Text>
            <TouchableOpacity>
               <Feather name="refresh-cw" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.headerTitle}>المنتجات</Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.actionButtons}>
             <TouchableOpacity style={styles.actionIconBtn}>
                <Feather name="grid" size={18} color={C.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.actionIconBtn}>
                <Feather name="sliders" size={18} color={C.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity style={styles.actionIconBtn}>
                <Feather name="align-justify" size={18} color={C.textSecondary} />
             </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="بحث"
              placeholderTextColor={C.textMuted}
              value={search}
              onChangeText={setSearch}
              textAlign="right"
            />
            <Feather name="search" size={18} color={C.textMuted} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cartBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
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
    fontSize: 16,
    color: "#444",
    fontFamily: "Inter_500Medium",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#333",
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
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F1F3F5",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: "#333",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  listContent: { padding: 12 },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  stockBadge: {
    backgroundColor: "#A01B5D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  stockText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  productCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  productName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#444",
    textAlign: "center",
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#F1F3F5",
    justifyContent: "center",
    alignItems: "center",
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
});

