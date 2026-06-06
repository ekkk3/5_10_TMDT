import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiService, formatVND, getImageUrl } from "@/services/api";

const CARD_WIDTH = Math.floor((Dimensions.get("window").width - 30) / 2);

interface Category {
  category_id: number;
  category_name: string;
}

interface Food {
  food_id: number;
  food_name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  status: string;
  average_rating?: number;
  review_count?: number;
  category?: { category_id: number; category_name: string };
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80";

const CATEGORY_COLORS = [
  "#FFE4E4",
  "#FFF3E0",
  "#E8F5E9",
  "#E3F2FD",
  "#F3E5F5",
  "#FFF9C4",
  "#FCE4EC",
  "#E0F7FA",
];

const CATEGORY_EMOJI: Record<string, string> = {
  burger: "🍔",
  "ga ran": "🍗",
  pizza: "🍕",
  "do uong": "🥤",
  snack: "🍟",
  wrap: "🌯",
  salad: "🥗",
  pasta: "🍝",
  sushi: "🍣",
  "trang mieng": "🍰",
  mi: "🍜",
  com: "🍚",
};

const getCategoryEmoji = (name: string) => {
  const lower = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  for (const key of Object.keys(CATEGORY_EMOJI)) {
    if (lower.includes(key)) return CATEGORY_EMOJI[key];
  }
  return "🍽️";
};

export default function MenuScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const params = useLocalSearchParams<{ categoryId?: string; searchText?: string }>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState(params.searchText || "");
  const [activeCategory, setActiveCategory] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null
  );

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialised = useRef(false);

  const fetchData = useCallback(
    async (
      keyword = searchText,
      categoryId = activeCategory,
      isRefresh = false
    ) => {
      try {
        if (!isRefresh) setLoading(true);
        const [catRes, foodRes] = await Promise.all([
          apiService.get("/menu/categories"),
          apiService.get(
            `/menu/foods?${new URLSearchParams({
              ...(keyword ? { keyword } : {}),
              ...(categoryId ? { categoryId: String(categoryId) } : {}),
            }).toString()}`
          ),
        ]);
        setCategories(catRes.data || []);
        setFoods(foodRes.data || []);
        setError("");
      } catch (err: any) {
        setError(
          err?.message || "Không thể tải thực đơn. Kiểm tra kết nối và thử lại."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchText, activeCategory]
  );

  useEffect(() => {
    const initCat = params.categoryId ? Number(params.categoryId) : null;
    const initSearch = params.searchText || "";
    if (!initialised.current) {
      initialised.current = true;
      fetchData(initSearch, initCat);
    }
  }, []);

  const onSearch = (text: string) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchData(text, activeCategory);
    }, 400);
  };

  const onCategoryPress = (id: number | null) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveCategory(id);
    fetchData(searchText, id);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(searchText, activeCategory, true);
  };

  const renderFood = ({ item }: { item: Food }) => {
    const available = item.is_available && item.status === "ACTIVE";
    const rating = Number(item.average_rating || 0);
    const isBestSeller = Number(item.review_count || 0) > 0;
    return (
      <Pressable
        style={({ pressed }) => [styles.foodCard, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => router.push(`/food/${item.food_id}`)}
      >
        {isBestSeller && (
          <View style={[styles.foodBadge, { backgroundColor: "#E11D48" }]}>
            <Text style={styles.foodBadgeText}>Bán chạy</Text>
          </View>
        )}
        {!available && (
          <View style={[styles.foodBadge, { backgroundColor: "rgba(0,0,0,0.6)", left: isBestSeller ? undefined : 8, right: isBestSeller ? 8 : undefined }]}>
            <Text style={styles.foodBadgeText}>Hết hàng</Text>
          </View>
        )}
        <Image
          source={{ uri: getImageUrl(item.image_url) || FALLBACK_IMAGE }}
          placeholder={{ uri: FALLBACK_IMAGE }}
          style={styles.foodImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.foodBody}>
          <Text style={styles.foodName} numberOfLines={2}>
            {item.food_name}
          </Text>
          {rating > 0 && (
            <Text style={styles.foodRating}>
              ⭐ {rating.toFixed(1)}
              {item.review_count ? ` · Đã bán ${item.review_count}` : ""}
            </Text>
          )}
          <View style={styles.foodFooter}>
            <Text style={styles.foodPrice}>
              {formatVND(Number(item.price))}
            </Text>
            <Pressable
              style={[styles.addCircle, { backgroundColor: available ? "#E11D48" : "#D1D5DB" }]}
              onPress={() => router.push(`/food/${item.food_id}`)}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + (isWeb ? 16 : 8),
            backgroundColor: "#fff",
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Thực đơn
        </Text>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Tìm burger, gà rán, đồ uống..."
            placeholderTextColor={colors.mutedForeground}
            value={searchText}
            onChangeText={onSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchText("");
                fetchData("", activeCategory);
              }}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>

        {/* ── Danh mục Style 2: tròn, nhỏ, cuộn ngang ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {/* Nút "Tất cả" */}
          <Pressable
            style={styles.catItem}
            onPress={() => onCategoryPress(null)}
          >
            <View
              style={[
                styles.catCircle,
                {
                  backgroundColor:
                    activeCategory === null ? "#E11D48" : "#F3F4F6",
                  borderWidth: activeCategory === null ? 0 : 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.catEmoji}>🍽️</Text>
            </View>
            <Text
              style={[
                styles.catLabel,
                {
                  color:
                    activeCategory === null ? "#E11D48" : colors.mutedForeground,
                  fontWeight: activeCategory === null ? "700" : "500",
                },
              ]}
            >
              Tất cả
            </Text>
          </Pressable>

          {categories.map((cat, index) => {
            const active = activeCategory === cat.category_id;
            const bg = active
              ? "#E11D48"
              : CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            const emoji = getCategoryEmoji(cat.category_name);
            return (
              <Pressable
                key={cat.category_id}
                style={styles.catItem}
                onPress={() => onCategoryPress(cat.category_id)}
              >
                <View
                  style={[
                    styles.catCircle,
                    {
                      backgroundColor: bg,
                      borderWidth: active ? 0 : 1,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.catEmoji}>{emoji}</Text>
                </View>
                <Text
                  style={[
                    styles.catLabel,
                    {
                      color: active ? "#E11D48" : colors.foreground,
                      fontWeight: active ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {cat.category_name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Danh sách món ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Đang tải thực đơn...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Không thể kết nối
          </Text>
          <Text style={[styles.errorDesc, { color: colors.mutedForeground }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => fetchData()}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : foods.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="restaurant-outline"
            size={48}
            color={colors.mutedForeground}
          />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Không tìm thấy món
          </Text>
          <Text style={[styles.errorDesc, { color: colors.mutedForeground }]}>
            Hãy thử đổi từ khóa hoặc danh mục khác
          </Text>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={(item) => String(item.food_id)}
          renderItem={renderFood}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: isWeb ? 120 : insets.bottom + 90 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 24, fontWeight: "800", marginBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },

  /* Category – tròn Style 2 */
  catScroll: { gap: 0, paddingRight: 8, paddingBottom: 2 },
  catItem: { alignItems: "center", width: 60, marginRight: 8 },
  catCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  catEmoji: { fontSize: 24 },
  catLabel: { fontSize: 11, textAlign: "center" },

  /* Food grid */
  list: { padding: 10, gap: 10 },
  row: { gap: 10 },
  foodCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: "#FFFBF0",
    overflow: "hidden",
    position: "relative",
  },
  foodBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  foodBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  foodImage: { width: CARD_WIDTH, height: 130 },
  foodBody: { padding: 9, gap: 3 },
  foodName: { fontSize: 13, fontWeight: "700", color: "#111827", lineHeight: 17 },
  foodRating: { fontSize: 11, color: "#6B7280" },
  foodFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  foodPrice: { fontSize: 14, fontWeight: "800", color: "#E11D48" },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: { fontSize: 15 },
  errorText: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
