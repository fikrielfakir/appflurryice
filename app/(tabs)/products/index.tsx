import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
  const { products } = useApp();
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const topInset = Platform.OS === "web" ? 20 : insets.top;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <View style={styles.productStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Price</Text>
          <Text style={styles.statValue}>MAD {fmt(item.price)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Stock</Text>
          <Text style={[
            styles.statValue, 
            item.stock < 10 ? { color: C.danger } : { color: C.success }
          ]}>
            {item.stock} {item.unit}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset + 10 }]}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={C.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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
  screen: { flex: 1, backgroundColor: C.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 16,
    marginLeft: 45, // Leave space for the menu button
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginLeft: 8,
  },
  listContent: { padding: 16 },
  productCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  productStats: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  statItem: { alignItems: "flex-end" },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: C.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
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
