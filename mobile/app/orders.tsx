import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiService, formatVND } from "@/services/api";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Chờ xác nhận", color: "#D97706", bg: "#FFFBEB" },
  CONFIRMED:  { label: "Đã xác nhận",  color: "#2563EB", bg: "#EFF6FF" },
  COOKING:    { label: "Đang chuẩn bị", color: "#7C3AED", bg: "#F5F3FF" },
  READY:      { label: "Sẵn sàng",      color: "#059669", bg: "#ECFDF5" },
  DELIVERING: { label: "Đang giao",     color: "#E11D48", bg: "#FFF1F2" },
  COMPLETED:  { label: "Đã giao",       color: "#16A34A", bg: "#F0FDF4" },
  CANCELLED:  { label: "Đã huỷ",        color: "#6B7280", bg: "#F3F4F6" },
};

interface Order {
  order_id: number;
  order_code: string;
  order_status: string;
  total_amount: number;
  created_at: string;
  items?: Array<{ food_name: string; quantity: number }>;
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await apiService.get("/account/orders");
      setOrders(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải lịch sử đơn hàng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchOrders(); }, [fetchOrders])
  );

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Lịch sử đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchOrders()}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptyDesc}>Đặt món ngay để xem lịch sử ở đây</Text>
          <Pressable style={styles.orderBtn} onPress={() => router.push("/(tabs)/menu")}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Đặt hàng ngay</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.order_id)}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E11D48" />}
          renderItem={({ item }) => {
            const st = STATUS_MAP[item.order_status] || STATUS_MAP["PENDING"];
            const preview = item.items?.slice(0, 2).map((i) => `${i.food_name} x${i.quantity}`).join(", ") || "";
            return (
              <Pressable
                style={({ pressed }) => [styles.orderCard, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => router.push({ pathname: "/order-detail", params: { id: String(item.order_id) } })}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.orderCode}>{item.order_code}</Text>
                    <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                {preview ? <Text style={styles.preview} numberOfLines={1}>{preview}</Text> : null}
                <View style={styles.cardBottom}>
                  <Text style={styles.total}>{formatVND(Number(item.total_amount))}</Text>
                  <View style={styles.chevronWrap}>
                    <Text style={{ color: "#E11D48", fontSize: 13, fontWeight: "600" }}>Xem chi tiết</Text>
                    <Ionicons name="chevron-forward" size={16} color="#E11D48" />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errText: { fontSize: 15, color: "#111827", textAlign: "center" },
  retryBtn: { backgroundColor: "#E11D48", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  orderBtn: { backgroundColor: "#E11D48", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, marginTop: 4 },
  orderCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderCode: { fontSize: 16, fontWeight: "800", color: "#111827" },
  orderDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  preview: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  total: { fontSize: 17, fontWeight: "800", color: "#E11D48" },
  chevronWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
});
