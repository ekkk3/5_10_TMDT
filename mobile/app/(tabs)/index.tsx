import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiService, formatVND, getImageUrl } from "@/services/api";
import { useCart } from "@/context/CartContext";

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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=480&q=80";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { totalQuantity } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, foodRes] = await Promise.all([
        apiService.get("/menu/categories"),
        apiService.get("/menu/foods"),
      ]);
      setCategories(catRes.data || []);
      setFoods(foodRes.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderCategory = ({ item, index }: { item: Category; index: number }) => {
    const bg = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    const emoji = getCategoryEmoji(item.category_name);
    return (
      <Pressable
        style={styles.catItem}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/menu",
            params: { categoryId: String(item.category_id) },
          })
        }
      >
        <View style={[styles.catCircle, { backgroundColor: bg }]}>
          <Text style={styles.catEmoji}>{emoji}</Text>
        </View>
        <Text style={[styles.catLabel, { color: colors.foreground }]} numberOfLines={1}>
          {item.category_name}
        </Text>
      </Pressable>
    );
  };

  const renderFoodCard = ({ item, index }: { item: Food; index: number }) => {
    const available = item.is_available && item.status === "ACTIVE";
    const rating = Number(item.average_rating || 0);
    const isBestSeller = Number(item.review_count || 0) > 0;
    const isNew = !isBestSeller;
    return (
      <Pressable
        style={styles.foodCard}
        onPress={() => router.push(`/food/${item.food_id}`)}
      >
        {isBestSeller && (
          <View style={[styles.foodBadge, { backgroundColor: "#E11D48" }]}>
            <Text style={styles.foodBadgeText}>Bán chạy</Text>
          </View>
        )}
        {isNew && (
          <View style={[styles.foodBadge, { backgroundColor: "#16A34A" }]}>
            <Text style={styles.foodBadgeText}>Mới</Text>
          </View>
        )}
        <Image
          source={{ uri: getImageUrl(item.image_url) || FALLBACK_IMAGE }}
          placeholder={{ uri: FALLBACK_IMAGE }}
          style={styles.foodImg}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.foodBody}>
          <Text style={[styles.foodName, { color: colors.foreground }]} numberOfLines={2}>
            {item.food_name}
          </Text>
          {rating > 0 && (
            <Text style={[styles.foodRating, { color: colors.mutedForeground }]}>
              ⭐ {rating.toFixed(1)}
              {item.review_count ? ` · Đã bán ${item.review_count}` : ""}
            </Text>
          )}
          <View style={styles.foodFooter}>
            <Text style={[styles.foodPrice, { color: colors.primary }]}>
              {formatVND(Number(item.price))}
            </Text>
            <Pressable
              style={[
                styles.addCircle,
                { backgroundColor: available ? colors.primary : colors.border },
              ]}
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
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      {/* ── HEADER kiểu ShopeeFood (đỏ) ── */}
      <LinearGradient
        colors={["#E11D48", "#C01038"]}
        style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 10) }]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.locBtn}>
            <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.85)" />
            <View>
              <Text style={styles.locLabel}>Giao đến</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <Text style={styles.locAddress} numberOfLines={1}>
                  ...
                </Text>
                <Ionicons name="chevron-down" size={11} color="#fff" />
              </View>
            </View>
          </Pressable>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {totalQuantity > 0 && (
                <View style={styles.cartDot}>
                  <Text style={styles.cartDotText}>{totalQuantity}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push("/(tabs)/menu")}
        >
          <Ionicons name="search" size={15} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Tìm món ăn yêu thích...</Text>
        </Pressable>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isWeb ? 100 : insets.bottom + 90,
        }}
      >
        {/* ── Banner khuyến mãi ── */}
        <View style={styles.bannerWrap}>
          <LinearGradient
            colors={["#FF6B35", "#E11D48"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagText}>🔥 KHUYẾN MÃI HÔM NAY</Text>
              </View>
              <Text style={styles.bannerTitle}>Giảm 30K</Text>
              <Text style={styles.bannerSub}>cho đơn đầu tiên</Text>
            </View>
            <Text style={{ fontSize: 56 }}>🎁</Text>
          </LinearGradient>
        </View>

        {/* ── Danh mục (Style 2 – tròn, kiểu GrabFood) ── */}
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Danh mục</Text>
            <Pressable onPress={() => router.push("/(tabs)/menu")}>
              <Text style={styles.sectionLink}>Tất cả</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color="#E11D48" style={{ marginVertical: 16 }} />
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.category_id)}
              renderItem={renderCategory}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 4, paddingRight: 4 }}
            />
          )}
        </View>

        {/* ── Món nổi bật ── */}
        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <View>
              <Text style={styles.sectionTitle}>🏆 Best Seller</Text>
              <Text style={styles.sectionSub}>Được đặt nhiều nhất từ trước đến nay</Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/menu")}>
              <Text style={styles.sectionLink}>Xem tất cả →</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color="#E11D48" style={{ marginVertical: 16 }} />
          ) : foods.length > 0 ? (
            <FlatList
              data={[...foods].sort((a, b) => (Number(b.review_count) || 0) - (Number(a.review_count) || 0)).slice(0, 8)}
              keyExtractor={(item) => String(item.food_id)}
              renderItem={renderFoodCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            />
          ) : (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Chưa có món ăn</Text>
            </View>
          )}
        </View>

        {/* ── Đề xuất cho bạn ── */}
        {foods.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionRow}>
              <View>
                <Text style={styles.sectionTitle}>Đề xuất cho bạn</Text>
                <Text style={styles.sectionSub}>Dựa trên lịch sử đặt hàng</Text>
              </View>
            </View>
            <View style={{ gap: 0 }}>
              {foods.slice(0, 5).map((item, i) => {
                const available = item.is_available && item.status === "ACTIVE";
                const rating = Number(item.average_rating || 0);
                return (
                  <Pressable
                    key={item.food_id}
                    style={[
                      styles.suggestRow,
                      i < 4 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
                    ]}
                    onPress={() => router.push(`/food/${item.food_id}`)}
                  >
                    <Image
                      source={{ uri: getImageUrl(item.image_url) || FALLBACK_IMAGE }}
                      placeholder={{ uri: FALLBACK_IMAGE }}
                      style={styles.suggestImg}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.suggestInfo}>
                      <Text
                        style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}
                        numberOfLines={1}
                      >
                        {item.food_name}
                      </Text>
                      <Text
                        style={{ color: "#6B7280", fontSize: 12, marginTop: 1 }}
                        numberOfLines={1}
                      >
                        {item.description || item.category?.category_name || ""}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                        {rating > 0 && (
                          <Text style={{ color: "#6B7280", fontSize: 12 }}>
                            ⭐ {rating.toFixed(1)}
                            {item.review_count ? ` · Đã bán ${item.review_count}` : ""}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: "#E11D48", fontSize: 15, fontWeight: "700", marginTop: 2 }}>
                        {formatVND(Number(item.price))}
                      </Text>
                    </View>
                    <Pressable
                      style={[
                        styles.suggestAdd,
                        { backgroundColor: available ? "#E11D48" : "#D1D5DB" },
                      ]}
                      onPress={() => router.push(`/food/${item.food_id}`)}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  locLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  locAddress: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 170,
  },
  headerIcons: { flexDirection: "row", gap: 2 },
  iconBtn: { padding: 6, position: "relative" },
  cartDot: {
    position: "absolute",
    top: 1,
    right: 1,
    backgroundColor: "#FFD60A",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartDotText: { color: "#111", fontSize: 10, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchPlaceholder: { color: "#9CA3AF", fontSize: 14, flex: 1 },
  bannerWrap: { paddingHorizontal: 12, paddingTop: 12 },
  banner: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bannerTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bannerTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  bannerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  bannerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    marginTop: 10,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  sectionLink: { fontSize: 13, fontWeight: "600", color: "#E11D48", paddingTop: 2 },

  /* Danh mục – tròn kiểu GrabFood */
  catItem: { alignItems: "center", width: 62, marginRight: 10 },
  catCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  catEmoji: { fontSize: 26 },
  catLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },

  /* Món nổi bật – card ngang */
  foodCard: {
    width: 155,
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
  foodImg: { width: 155, height: 120 },
  foodBody: { padding: 9, gap: 3 },
  foodName: { fontSize: 13, fontWeight: "700", lineHeight: 17 },
  foodRating: { fontSize: 11 },
  foodFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  foodPrice: { fontSize: 14, fontWeight: "800" },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Đề xuất */
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  suggestImg: { width: 72, height: 72, borderRadius: 12 },
  suggestInfo: { flex: 1 },
  suggestAdd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
