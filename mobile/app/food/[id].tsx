import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { apiService, formatVND, getImageUrl } from "@/services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80";

interface OptionChoice {
  option_id: number;
  option_name: string;
  extra_price: number;
  status: string;
  option_type?: string;
}
interface OptionGroup {
  option_group_id: number;
  option_group_name: string;
  option_type: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: OptionChoice[];
}
interface FoodDetail {
  food_id: number;
  food_name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  status: string;
  average_rating?: number;
  review_count?: number;
  category?: { category_name: string };
  reviews?: Array<{ reviewer_name?: string; rating: number; comment?: string }>;
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { addItem } = useCart();

  const [food, setFood] = useState<FoodDetail | null>(null);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [foodRes, optRes] = await Promise.all([
          apiService.get(`/menu/foods/${id}`),
          apiService.get(`/food-options/${id}`),
        ]);
        setFood(foodRes.data);
        setOptionGroups(optRes.data || []);
      } catch (err: any) {
        setError(err?.message || "Không thể tải chi tiết món");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toggleOption = (groupId: number, optionId: number, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((o) => o !== optionId) };
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const getSelectedOptionsList = () => {
    const result: Array<{ option_id: number; option_name: string; option_type: string; extra_price: number }> = [];
    for (const group of optionGroups) {
      const ids = selectedOptions[group.option_group_id] || [];
      for (const optionId of ids) {
        const opt = group.options.find((o) => o.option_id === optionId);
        if (opt) result.push({ option_id: opt.option_id, option_name: opt.option_name, option_type: group.option_type, extra_price: Number(opt.extra_price || 0) });
      }
    }
    return result;
  };

  const calcPrice = () => {
    if (!food) return 0;
    const base = Number(food.price);
    const opts = getSelectedOptionsList().reduce((s, o) => s + o.extra_price, 0);
    return (base + opts) * quantity;
  };

  const handleAddToCart = () => {
    if (!food) return;
    const opts = getSelectedOptionsList();
    addItem({ food_id: food.food_id, food_name: food.food_name, image_url: getImageUrl(food.image_url) || FALLBACK_IMAGE, base_price: Number(food.price), selected_options: opts, quantity, note: note.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setAddedToCart(true);
    setTimeout(() => { router.back(); router.push("/(tabs)/cart"); }, 800);
  };

  const available = food ? food.is_available && food.status === "ACTIVE" : false;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  if (error || !food) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", gap: 12, padding: 32 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "center" }}>{error || "Không tìm thấy món"}</Text>
        <Pressable style={styles.redBtn} onPress={() => router.back()}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isWeb ? 140 : insets.bottom + 120 }}>
        {/* Hero image */}
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: getImageUrl(food.image_url) || FALLBACK_IMAGE }}
            placeholder={{ uri: FALLBACK_IMAGE }}
            style={{ width: "100%", height: 300 }}
            contentFit="cover"
            transition={300}
          />
          {/* Close btn */}
          <Pressable
            style={[styles.closeBtn, { top: isWeb ? 67 + 12 : insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>
          {/* Availability badge on image */}
          {!available && (
            <View style={styles.outOverlay}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Hết hàng</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {food.category && (
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 }}>
              {food.category.category_name.toUpperCase()}
            </Text>
          )}
          <Text style={styles.foodName}>{food.food_name}</Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.foodPrice}>{formatVND(Number(food.price))}</Text>
            <View style={[styles.availBadge, { backgroundColor: available ? "#F0FDF4" : "#FEF2F2" }]}>
              <Text style={{ color: available ? "#16A34A" : "#EF4444", fontSize: 12, fontWeight: "700" }}>
                {available ? "Còn hàng" : "Hết hàng"}
              </Text>
            </View>
          </View>

          {Number(food.average_rating || 0) > 0 && (
            <Text style={{ color: "#6B7280", fontSize: 14 }}>
              ⭐ {Number(food.average_rating).toFixed(1)}/5
              {food.review_count ? ` (${food.review_count} đánh giá)` : ""}
            </Text>
          )}

          {food.description && (
            <Text style={{ color: "#6B7280", fontSize: 15, lineHeight: 22, marginTop: 4 }}>{food.description}</Text>
          )}

          {/* Option groups */}
          {optionGroups.map((group) => {
            const activeIds = selectedOptions[group.option_group_id] || [];
            return (
              <View key={group.option_group_id} style={styles.optGroup}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{group.option_group_name}</Text>
                  <View style={[styles.reqBadge, { backgroundColor: group.is_required ? "#FFF1F2" : "#F3F4F6" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: group.is_required ? "#E11D48" : "#6B7280" }}>
                      {group.is_required ? "Bắt buộc" : "Tuỳ chọn"} · Chọn {group.max_select === 1 ? "1" : `tối đa ${group.max_select}`}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 8 }}>
                  {group.options.filter((o) => o.status === "ACTIVE").map((opt) => {
                    const active = activeIds.includes(opt.option_id);
                    return (
                      <Pressable
                        key={opt.option_id}
                        style={[styles.optChoice, { backgroundColor: active ? "#FFF1F2" : "#F9FAFB", borderColor: active ? "#E11D48" : "#E5E7EB" }]}
                        onPress={() => toggleOption(group.option_group_id, opt.option_id, group.max_select)}
                      >
                        <View style={[styles.optCheck, { borderColor: active ? "#E11D48" : "#D1D5DB", backgroundColor: active ? "#E11D48" : "transparent" }]}>
                          {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" }}>{opt.option_name}</Text>
                        {Number(opt.extra_price) > 0 && (
                          <Text style={{ fontSize: 13, fontWeight: "700", color: "#E11D48" }}>+{formatVND(Number(opt.extra_price))}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Quantity & Note */}
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <View>
              <Text style={styles.ctrlLabel}>Số lượng</Text>
              <View style={styles.qtyRow}>
                <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                  <Ionicons name="remove" size={18} color="#111827" />
                </Pressable>
                <Text style={styles.qtyVal}>{quantity}</Text>
                <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
                  <Ionicons name="add" size={18} color="#111827" />
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctrlLabel}>Ghi chú</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Ví dụ: ít cay, không hành..."
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                maxLength={180}
              />
            </View>
          </View>

          {/* Reviews */}
          {food.reviews && food.reviews.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>Đánh giá</Text>
              {food.reviews.slice(0, 3).map((r, i) => (
                <View key={i} style={[styles.reviewItem, i < food.reviews!.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{r.reviewer_name || "Khách hàng"}</Text>
                    <Text style={{ color: "#6B7280", fontSize: 13 }}>⭐ {Number(r.rating).toFixed(1)}</Text>
                  </View>
                  {r.comment && <Text style={{ fontSize: 14, color: "#6B7280", lineHeight: 20 }}>{r.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to cart footer */}
      <View style={[styles.footer, { paddingBottom: isWeb ? 34 : insets.bottom + 10 }]}>
        <View>
          <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700" }}>Tổng</Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#E11D48" }}>{formatVND(calcPrice())}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: available ? (addedToCart ? "#16A34A" : "#E11D48") : "#D1D5DB", opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleAddToCart}
          disabled={!available || addedToCart}
        >
          <Ionicons name={addedToCart ? "checkmark" : "cart"} size={20} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            {addedToCart ? "Đã thêm!" : available ? "Thêm vào giỏ" : "Hết hàng"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: "absolute",
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  outOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    paddingVertical: 10,
  },
  content: { padding: 20, gap: 12 },
  foodName: { fontSize: 24, fontWeight: "800", color: "#111827", lineHeight: 30 },
  foodPrice: { fontSize: 22, fontWeight: "800", color: "#E11D48" },
  availBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  optGroup: { backgroundColor: "#F9FAFB", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 14 },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  optChoice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  optCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  ctrlLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 6 },
  qtyRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  qtyBtn: { padding: 10 },
  qtyVal: { minWidth: 36, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#111827" },
  noteInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, height: 46, backgroundColor: "#F9FAFB", color: "#111827" },
  reviewItem: { paddingBottom: 10 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#fff",
    gap: 14,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  redBtn: { backgroundColor: "#E11D48", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
