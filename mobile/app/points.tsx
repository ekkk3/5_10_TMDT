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
import { apiService } from "@/services/api";

interface PointEntry {
  point_id: number;
  points: number;
  type: "EARN" | "SPEND" | string;
  description?: string;
  created_at: string;
}
interface PointsData {
  total_points: number;
  history: PointEntry[];
}

export default function PointsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [data, setData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchPoints = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await apiService.get("/account/points");
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || "Không thể tải điểm tích luỹ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPoints(); }, []);

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear()}`;
  };

  const history = data?.history || [];
  const totalPoints = data?.total_points ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Điểm tích luỹ</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#E11D48" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 14, color: "#111827" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.point_id)}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPoints(true); }} tintColor="#E11D48" />}
          contentContainerStyle={{ paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
          ListHeaderComponent={
            <>
              <View style={styles.banner}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="star" size={36} color="#F59E0B" />
                </View>
                <Text style={styles.bannerPoints}>{totalPoints}</Text>
                <Text style={styles.bannerLabel}>điểm tích luỹ</Text>
                <Text style={styles.bannerHint}>Dùng điểm để đổi voucher giảm giá</Text>
              </View>
              <View style={styles.infoRow}>
                {[
                  { icon: "cart-outline", title: "Tích điểm", desc: "Mỗi 10.000₫ = 1 điểm" },
                  { icon: "gift-outline", title: "Đổi quà", desc: "100 điểm = voucher 10%" },
                ].map((item, i) => (
                  <View key={i} style={styles.infoCard}>
                    <Ionicons name={item.icon as any} size={22} color="#E11D48" />
                    <Text style={styles.infoTitle}>{item.title}</Text>
                    <Text style={styles.infoDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>
              {history.length > 0 && (
                <Text style={styles.historyTitle}>Lịch sử điểm</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="star-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Chưa có lịch sử điểm</Text>
              <Text style={styles.emptyDesc}>Đặt hàng để bắt đầu tích điểm</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isEarn = item.type === "EARN" || item.points > 0;
            return (
              <View style={[styles.historyItem, index > 0 && { borderTopWidth: 1, borderTopColor: "#F3F4F6" }]}>
                <View style={[styles.pointIcon, { backgroundColor: isEarn ? "#F0FDF4" : "#FEF2F2" }]}>
                  <Ionicons name={isEarn ? "add-circle" : "remove-circle"} size={20} color={isEarn ? "#16A34A" : "#EF4444"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointDesc}>{item.description || (isEarn ? "Tích điểm đơn hàng" : "Dùng điểm")}</Text>
                  <Text style={styles.pointDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={[styles.pointAmount, { color: isEarn ? "#16A34A" : "#EF4444" }]}>
                  {isEarn ? "+" : ""}{item.points} điểm
                </Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  banner: { backgroundColor: "#E11D48", margin: 14, borderRadius: 16, padding: 24, alignItems: "center", gap: 4 },
  bannerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  bannerPoints: { fontSize: 48, fontWeight: "900", color: "#fff" },
  bannerLabel: { fontSize: 16, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  bannerHint: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  infoRow: { flexDirection: "row", gap: 10, marginHorizontal: 14, marginBottom: 14 },
  infoCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6", padding: 14, gap: 4, alignItems: "center" },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  infoDesc: { fontSize: 12, color: "#6B7280", textAlign: "center" },
  historyTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginHorizontal: 14, marginBottom: 8 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff" },
  pointIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pointDesc: { fontSize: 14, fontWeight: "600", color: "#111827" },
  pointDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  pointAmount: { fontSize: 15, fontWeight: "800" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6B7280" },
});