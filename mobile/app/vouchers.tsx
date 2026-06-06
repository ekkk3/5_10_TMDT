import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

interface Voucher {
  voucher_id: number;
  code: string;
  description?: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  expires_at?: string;
  is_used?: boolean;
}

export default function VouchersScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchVouchers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await apiService.get("/account/vouchers");
      setVouchers(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải voucher");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const formatDiscount = (v: Voucher) =>
    v.discount_type === "PERCENT" ? `Giảm ${v.discount_value}%` : `Giảm ${formatVND(v.discount_value)}`;

  const formatExpiry = (d?: string) => {
    if (!d) return "";
    const dt = new Date(d);
    return `HSD: ${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Ví Voucher</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#E11D48" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 14, color: "#111827", textAlign: "center" }}>{error}</Text>
        </View>
      ) : vouchers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="ticket-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Chưa có voucher nào</Text>
          <Text style={styles.emptyDesc}>Voucher sẽ xuất hiện sau khi bạn đặt hàng hoặc nhận ưu đãi</Text>
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(v) => String(v.voucher_id)}
          contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchVouchers(true); }} tintColor="#E11D48" />}
          renderItem={({ item }) => {
            const expired = item.is_used || (item.expires_at ? new Date(item.expires_at) < new Date() : false);
            return (
              <View style={[styles.voucherCard, expired && { opacity: 0.55 }]}>
                {/* Left stripe */}
                <View style={[styles.stripe, { backgroundColor: expired ? "#9CA3AF" : "#E11D48" }]} />
                <View style={styles.voucherLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: expired ? "#F3F4F6" : "#FFF1F2" }]}>
                    <Ionicons name="ticket" size={22} color={expired ? "#9CA3AF" : "#E11D48"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voucherCode}>{item.code}</Text>
                    <Text style={[styles.voucherDiscount, { color: expired ? "#9CA3AF" : "#E11D48" }]}>
                      {formatDiscount(item)}
                    </Text>
                    {item.min_order_value && item.min_order_value > 0 ? (
                      <Text style={styles.voucherMeta}>Đơn tối thiểu {formatVND(item.min_order_value)}</Text>
                    ) : null}
                    {item.max_discount_amount && item.max_discount_amount > 0 ? (
                      <Text style={styles.voucherMeta}>Giảm tối đa {formatVND(item.max_discount_amount)}</Text>
                    ) : null}
                    {item.description ? <Text style={styles.voucherMeta}>{item.description}</Text> : null}
                  </View>
                </View>
                <View style={styles.voucherRight}>
                  {item.expires_at ? <Text style={styles.expiry}>{formatExpiry(item.expires_at)}</Text> : null}
                  {item.is_used ? (
                    <View style={styles.usedBadge}><Text style={{ color: "#9CA3AF", fontSize: 10, fontWeight: "700" }}>ĐÃ DÙNG</Text></View>
                  ) : expired ? (
                    <View style={[styles.usedBadge, { backgroundColor: "#FEF2F2" }]}><Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "700" }}>HẾT HẠN</Text></View>
                  ) : (
                    <Pressable
                      style={styles.useBtn}
                      onPress={() => router.push("/(tabs)/cart")}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>DÙNG NGAY</Text>
                    </Pressable>
                  )}
                </View>
              </View>
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
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  voucherCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", flexDirection: "row", overflow: "hidden" },
  stripe: { width: 6 },
  voucherLeft: { flex: 1, flexDirection: "row", gap: 10, padding: 14 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  voucherCode: { fontSize: 15, fontWeight: "800", color: "#111827", letterSpacing: 0.5 },
  voucherDiscount: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  voucherMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  voucherRight: { padding: 12, alignItems: "center", justifyContent: "center", gap: 6, minWidth: 80, borderLeftWidth: 1, borderLeftColor: "#F3F4F6", borderStyle: "dashed" },
  expiry: { fontSize: 10, color: "#9CA3AF", textAlign: "center" },
  usedBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  useBtn: { backgroundColor: "#E11D48", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
});
