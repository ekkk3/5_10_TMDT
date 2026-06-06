import { Ionicons } from "@expo/vector-icons";
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
import { apiService, formatVND } from "@/services/api";

const ORDER_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED"];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Chờ xác nhận", color: "#D97706", bg: "#FFFBEB" },
  CONFIRMED:  { label: "Đã xác nhận",  color: "#2563EB", bg: "#EFF6FF" },
  PREPARING:  { label: "Đang chuẩn bị", color: "#7C3AED", bg: "#F5F3FF" },
  READY:      { label: "Sẵn sàng",      color: "#059669", bg: "#ECFDF5" },
  DELIVERING: { label: "Đang giao",     color: "#E11D48", bg: "#FFF1F2" },
  DELIVERED:  { label: "Đã giao",       color: "#16A34A", bg: "#F0FDF4" },
  CANCELLED:  { label: "Đã huỷ",        color: "#6B7280", bg: "#F3F4F6" },
};

interface OrderItem {
  food_name: string;
  quantity: number;
  item_total: number;
}
interface Order {
  order_code: string;
  status: string;
  guest_name?: string;
  guest_address?: string;
  total_amount?: number;
  items?: OrderItem[];
}

export default function TrackScreen() {
  const params = useLocalSearchParams<{ orderCode?: string; phone?: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [orderCode, setOrderCode] = useState(params.orderCode || "");
  const [phone, setPhone] = useState(params.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (params.orderCode && params.phone) { handleSearch(); }
  }, []);

  const handleSearch = async () => {
    const code = orderCode.trim().toUpperCase();
    const ph = phone.trim();
    if (!code || !ph) { setError("Vui lòng nhập đầy đủ mã đơn và số điện thoại"); return; }
    try {
      setLoading(true);
      setError("");
      setOrder(null);
      const res = await apiService.get(`/orders/track?orderCode=${code}&phone=${ph}`);
      setOrder(res.data);
    } catch (err: any) {
      setError(err?.message || "Không tìm thấy đơn hàng. Kiểm tra lại mã và số điện thoại.");
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order ? ORDER_STEPS.indexOf(order.status) : -1;
  const statusInfo = order ? (STATUS_LABELS[order.status] || STATUS_LABELS["PENDING"]) : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔍 Tra cứu đơn hàng</Text>
          <Text style={{ color: "#6B7280", fontSize: 13, lineHeight: 18 }}>
            Nhập mã đơn hàng và số điện thoại đã đặt để kiểm tra trạng thái
          </Text>

          {error ? (
            <View style={styles.alertErr}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600", flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <View>
            <Text style={styles.label}>Mã đơn hàng</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: ORD-ABC12345"
              placeholderTextColor="#9CA3AF"
              value={orderCode}
              onChangeText={(t) => { setOrderCode(t.toUpperCase()); setError(""); }}
              autoCapitalize="characters"
              returnKeyType="next"
            />
          </View>
          <View>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="0901234567"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              keyboardType="phone-pad"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Tra cứu</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Order result */}
        {order && statusInfo && (
          <>
            {/* Status card */}
            <View style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 }}>MÃ ĐƠN HÀNG</Text>
                  <Text style={styles.orderCode}>{order.order_code}</Text>
                  {order.guest_name && <Text style={{ color: "#6B7280", fontSize: 13 }}>{order.guest_name}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                  <Text style={{ color: statusInfo.color, fontSize: 13, fontWeight: "700" }}>{statusInfo.label}</Text>
                </View>
              </View>

              {/* Timeline */}
              {order.status !== "CANCELLED" && (
                <View style={{ gap: 0 }}>
                  {ORDER_STEPS.slice(0, -1).map((step, i) => {
                    const done = currentStepIndex >= i;
                    const active = i === currentStepIndex;
                    const info = STATUS_LABELS[step];
                    return (
                      <View key={step} style={styles.timelineRow}>
                        <View style={styles.timelineLeft}>
                          <View style={[styles.dot, { backgroundColor: done ? "#E11D48" : "#E5E7EB", borderColor: done ? "#E11D48" : "#E5E7EB" }]}>
                            {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                          </View>
                          {i < ORDER_STEPS.length - 2 && (
                            <View style={[styles.line, { backgroundColor: done && i < currentStepIndex ? "#E11D48" : "#E5E7EB" }]} />
                          )}
                        </View>
                        <Text style={[styles.timelineText, {
                          color: active ? "#E11D48" : done ? "#111827" : "#9CA3AF",
                          fontWeight: active ? "700" : "500",
                        }]}>
                          {info?.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🍽️ Món đã đặt</Text>
                {order.items.map((item, i) => (
                  <View key={i} style={[{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
                    i < order.items!.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
                    <Text style={{ flex: 1, fontSize: 14, color: "#111827" }}>{item.food_name} x{item.quantity}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#E11D48" }}>{formatVND(item.item_total)}</Text>
                  </View>
                ))}
                {order.total_amount !== undefined && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>Tổng cộng</Text>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#E11D48" }}>{formatVND(order.total_amount)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Address */}
            {order.guest_address && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📍 Địa chỉ giao hàng</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Ionicons name="location-outline" size={18} color="#9CA3AF" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, color: "#6B7280", fontSize: 14, lineHeight: 20 }}>{order.guest_address}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  alertErr: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  label: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 5 },
  input: { height: 50, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, fontSize: 15, backgroundColor: "#F9FAFB", color: "#111827" },
  searchBtn: { height: 50, borderRadius: 12, backgroundColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  orderCode: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  timelineLeft: { alignItems: "center", width: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  line: { width: 2, height: 22, marginTop: 2 },
  timelineText: { fontSize: 14, paddingBottom: 16, flex: 1 },
});
