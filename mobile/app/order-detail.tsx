import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import { apiService, formatVND } from "@/services/api";
import { useCart } from "@/context/CartContext";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Chờ xác nhận", color: "#D97706", bg: "#FFFBEB" },
  CONFIRMED:  { label: "Đã xác nhận",  color: "#2563EB", bg: "#EFF6FF" },
  COOKING:    { label: "Đang chuẩn bị", color: "#7C3AED", bg: "#F5F3FF" },
  READY:      { label: "Sẵn sàng",      color: "#059669", bg: "#ECFDF5" },
  DELIVERING: { label: "Đang giao",     color: "#E11D48", bg: "#FFF1F2" },
  COMPLETED:  { label: "Đã giao",       color: "#16A34A", bg: "#F0FDF4" },
  CANCELLED:  { label: "Đã huỷ",        color: "#6B7280", bg: "#F3F4F6" },
};

const ORDER_STEPS = ["PENDING", "CONFIRMED", "COOKING", "READY", "DELIVERING", "COMPLETED"];

interface OrderItem {
  food_id: number;
  food_name: string;
  quantity: number;
  total_price: number;
  has_review?: boolean;
}
interface OrderDetail {
  order_id: number;
  order_code: string;
  order_status: string;
  subtotal: number;
  discount_amount?: number;
  delivery_fee?: number;
  total_amount: number;
  delivery_address?: string;
  note?: string;
  created_at: string;
  items: OrderItem[];
  payment_method?: string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { addItem } = useCart();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [reviewingFoodId, setReviewingFoodId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const [isAuthError, setIsAuthError] = useState(false); // Chặn spam lỗi 401 ngầm
  const appStateRef = useRef(AppState.currentState);

  const fetchDetail = useCallback(async (mode: "init" | "pull" | "silent" = "init") => {
    if (isAuthError) return; // Nếu token hỏng thì ngừng gọi ngay lập tức
    
    try {
      if (mode === "init") { setLoading(true); setError(""); }
      if (mode === "pull") setRefreshing(true);
      const res = await apiService.get(`/account/orders/${id}`);
      setOrder(res.data);
    } catch (err: any) {
      // Đánh chặn nếu backend ném về lỗi 401 Unauthorized
      if (err?.status === 401 || String(err).includes("401") || err?.message?.includes("401")) {
        setIsAuthError(true);
        setError("Phiên đăng nhập hết hạn. Vui lòng quay lại tab Tài khoản để Đăng xuất & Đăng nhập lại.");
        return;
      }
      if (mode !== "silent") setError(err?.message || "Không thể tải chi tiết đơn hàng");
    } finally {
      if (mode === "init") setLoading(false);
      if (mode === "pull") setRefreshing(false);
    }
  }, [id, isAuthError]);

  useFocusEffect(
    useCallback(() => { fetchDetail("init"); }, [fetchDetail])
  );

  // Trích xuất order_status để làm dependency ổn định (Sửa lỗi đỏ tại đây)
  const orderStatus = order?.order_status;

  // VÒNG LẶP POLLING TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI (ĐÃ ĐƯỢC TỐI ƯU CHỐNG TREO)
  useEffect(() => {
    if (isAuthError) return; // Không kích hoạt lặp nếu Token đã chết
    
    const runPolling = () => {
      if (order && ["COMPLETED", "CANCELLED"].includes(order.order_status)) {
        return;
      }
      fetchDetail("silent");
    };

    const timer = setInterval(runPolling, 5000);

    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        runPolling();
      }
      appStateRef.current = nextState;
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [id, fetchDetail, orderStatus, isAuthError]); // Đã thay bằng biến orderStatus hợp lệ

  const handleCancel = () => {
    Alert.alert("Huỷ đơn hàng", "Bạn có chắc muốn huỷ đơn hàng này?", [
      { text: "Không", style: "cancel" },
      {
        text: "Huỷ đơn", style: "destructive",
        onPress: async () => {
          try {
            setCancelling(true);
            await apiService.patch(`/account/orders/${id}/cancel`, { reason: "Khách hàng huỷ" });
            await fetchDetail("init");
          } catch (err: any) {
            Alert.alert("Lỗi", err?.message || "Không thể huỷ đơn hàng");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const handleReorder = async () => {
    try {
      setReordering(true);
      const res = await apiService.post(`/account/orders/${id}/reorder`, {});
      const items = res.data?.items || [];
      for (const item of items) {
        addItem({
          food_id: item.food_id,
          food_name: item.food_name,
          image_url: item.image_url || "",
          base_price: Number(item.base_price || item.price || 0),
          selected_options: item.selected_options || [],
          quantity: item.quantity,
          note: item.note || "",
        });
      }
      Alert.alert("Đã thêm vào giỏ!", "Các món đã được thêm vào giỏ hàng.", [
        { text: "Xem giỏ hàng", onPress: () => router.push("/(tabs)/cart") },
        { text: "Tiếp tục", style: "cancel" },
      ]);
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể đặt lại đơn hàng");
    } finally {
      setReordering(false);
    }
  };

  const handleSubmitReview = async (foodId: number) => {
    if (!rating) return;
    try {
      setSubmittingReview(true);
      await apiService.post(`/account/orders/${id}/reviews`, { food_id: foodId, rating, comment: comment.trim() });
      setReviewedIds((prev) => new Set([...prev, foodId]));
      setReviewingFoodId(null);
      setComment("");
      setRating(5);
      Alert.alert("Cảm ơn!", "Đánh giá của bạn đã được gửi.");
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể gửi đánh giá");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()} ${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#E11D48" />
    </View>
  );

  if (error || !order) return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={{ fontSize: 15, color: "#111827", textAlign: "center", fontWeight: "600" }}>{error || "Không tìm thấy đơn hàng"}</Text>
        <Pressable style={styles.redBtnCustom} onPress={() => router.push("/(tabs)/account")}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Đến tab Tài khoản để Logout</Text>
        </Pressable>
      </View>
    </View>
  );

  const st = STATUS_MAP[order.order_status] || STATUS_MAP["PENDING"];
  const stepIdx = ORDER_STEPS.indexOf(order.order_status);
  const canCancel = ["PENDING", "CONFIRMED"].includes(order.order_status);
  const isDelivered = order.order_status === "COMPLETED";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDetail("pull")}
            tintColor="#E11D48"
            colors={["#E11D48"]}
          />
        }
      >
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 }}>MÃ ĐƠN</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{order.order_code}</Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{formatDate(order.created_at)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          {order.order_status !== "CANCELLED" && (
            <View style={{ marginTop: 14, gap: 0 }}>
              {ORDER_STEPS.slice(0, -1).map((step, i) => {
                const done = stepIdx >= i;
                const active = i === stepIdx;
                return (
                  <View key={step} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ alignItems: "center", width: 20 }}>
                      <View style={[styles.dot, { backgroundColor: done ? "#E11D48" : "#E5E7EB", borderColor: done ? "#E11D48" : "#E5E7EB" }]}>
                        {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                      </View>
                      {i < ORDER_STEPS.length - 2 && (
                        <View style={[styles.line, { backgroundColor: done && i < stepIdx ? "#E11D48" : "#E5E7EB" }]} />
                      )}
                    </View>
                    <Text style={{ fontSize: 13, paddingBottom: 14, flex: 1, color: active ? "#E11D48" : done ? "#111827" : "#9CA3AF", fontWeight: active ? "700" : "400" }}>
                      {STATUS_MAP[step]?.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍽️ Món đã đặt</Text>
          {order.items.map((item, i) => {
            const alreadyReviewed = item.has_review || reviewedIds.has(item.food_id);
            const isReviewing = reviewingFoodId === item.food_id;
            return (
              <View key={i}>
                <View style={[styles.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10, marginTop: 2 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{item.food_name}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>x{item.quantity}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#E11D48" }}>{formatVND(Number(item.total_price || 0))}</Text>
                </View>
                {isDelivered && (
                  alreadyReviewed ? (
                    <View style={styles.reviewedTag}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "600" }}>Đã đánh giá</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.reviewBtn}
                      onPress={() => { setReviewingFoodId(isReviewing ? null : item.food_id); setRating(5); setComment(""); }}
                    >
                      <Ionicons name="star-outline" size={14} color="#E11D48" />
                      <Text style={{ color: "#E11D48", fontSize: 12, fontWeight: "600" }}>
                        {isReviewing ? "Đóng đánh giá" : "Đánh giá món này"}
                      </Text>
                    </Pressable>
                  )
                )}
                {isReviewing && (
                  <View style={styles.reviewForm}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Pressable key={s} onPress={() => setRating(s)}>
                          <Ionicons name={s <= rating ? "star" : "star-outline"} size={28} color={s <= rating ? "#F59E0B" : "#D1D5DB"} />
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Nhận xét của bạn (tuỳ chọn)..."
                      placeholderTextColor="#9CA3AF"
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      numberOfLines={3}
                    />
                    <Pressable
                      style={[styles.redBtn, { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center" }]}
                      onPress={() => handleSubmitReview(item.food_id)}
                      disabled={submittingReview}
                    >
                      {submittingReview ? <ActivityIndicator color="#fff" size="small" /> : (
                        <><Ionicons name="send" size={16} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700" }}>Gửi đánh giá</Text></>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12, marginTop: 8, gap: 6 }}>
            {order.discount_amount && order.discount_amount > 0 ? (
              <View style={styles.sumRow}>
                <Text style={styles.sumKey}>Giảm giá</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#16A34A" }}>-{formatVND(Number(order.discount_amount))}</Text>
              </View>
            ) : null}
            {order.delivery_fee !== undefined && (
              <View style={styles.sumRow}>
                <Text style={styles.sumKey}>Phí giao hàng</Text>
                <Text style={styles.sumVal}>{formatVND(Number(order.delivery_fee))}</Text>
              </View>
            )}
            <View style={styles.sumRow}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>Tổng cộng</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#E11D48" }}>{formatVND(Number(order.total_amount))}</Text>
            </View>
          </View>
        </View>

        {order.delivery_address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Địa chỉ giao hàng</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Ionicons name="location-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: "#6B7280", fontSize: 14, lineHeight: 20 }}>{order.delivery_address}</Text>
            </View>
            {order.note ? <Text style={{ color: "#9CA3AF", fontSize: 13, fontStyle: "italic" }}>Ghi chú: {order.note}</Text> : null}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Pressable style={({ pressed }) => [styles.reorderBtn, { opacity: pressed ? 0.9 : 1 }]} onPress={handleReorder} disabled={reordering}>
            {reordering ? <ActivityIndicator color="#E11D48" size="small" /> : (
              <><Ionicons name="refresh" size={18} color="#E11D48" /><Text style={{ color: "#E11D48", fontSize: 15, fontWeight: "700" }}>Đặt lại đơn này</Text></>
            )}
          </Pressable>
          {canCancel && (
            <Pressable style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={handleCancel} disabled={cancelling}>
              {cancelling ? <ActivityIndicator color="#EF4444" size="small" /> : (
                <><Ionicons name="close-circle-outline" size={18} color="#EF4444" /><Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "700" }}>Huỷ đơn hàng</Text></>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827", marginBottom: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  line: { width: 2, height: 20, marginTop: 2 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 6, gap: 8 },
  reviewedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, marginBottom: 2 },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, marginBottom: 4 },
  reviewForm: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, gap: 10, marginTop: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  stars: { flexDirection: "row", gap: 4 },
  reviewInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 72, textAlignVertical: "top", backgroundColor: "#fff", color: "#111827" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumKey: { fontSize: 14, color: "#6B7280" },
  sumVal: { fontSize: 14, fontWeight: "600", color: "#111827" },
  reorderBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFF1F2" },
  cancelBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: "#EF4444", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  redBtn: { height: 44, borderRadius: 12, backgroundColor: "#E11D48", paddingHorizontal: 20 },
  redBtnCustom: { height: 48, borderRadius: 12, backgroundColor: "#E11D48", paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
});