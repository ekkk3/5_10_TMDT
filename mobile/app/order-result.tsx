import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

export default function OrderResultScreen() {
  const { orderCode, phone, orderId } = useLocalSearchParams<{ orderCode: string; phone: string; orderId?: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { isLoggedIn } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: topPad + 24, paddingBottom: isWeb ? 60 : insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
          </View>
        </View>

        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={styles.title}>Đặt hàng thành công! 🎉</Text>
          <Text style={styles.desc}>
            {isLoggedIn
              ? "Đơn hàng đã được tiếp nhận và tích điểm vào tài khoản của bạn."
              : "Đơn hàng đã được tiếp nhận. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất."}
          </Text>
        </View>

        {orderCode ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>MÃ ĐƠN HÀNG</Text>
            <Text style={styles.codeValue}>{orderCode}</Text>
            <Text style={styles.codeHint}>
              {isLoggedIn ? "Xem trong mục Lịch sử đơn hàng" : "Lưu mã này để theo dõi đơn hàng"}
            </Text>
          </View>
        ) : null}

        {/* Steps */}
        <View style={styles.stepsCard}>
          {[
            { icon: "receipt-outline" as const, text: "Đơn hàng đã được tiếp nhận", active: true },
            { icon: "restaurant-outline" as const, text: "Nhà bếp đang chuẩn bị món", active: false },
            { icon: "bicycle-outline" as const, text: "Giao hàng đến địa chỉ của bạn", active: false },
          ].map((step, i) => (
            <View key={i} style={[styles.step, i < 2 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }]}>
              <View style={[styles.stepIcon, { backgroundColor: step.active ? "#FFF1F2" : "#F3F4F6" }]}>
                <Ionicons name={step.icon} size={20} color={step.active ? "#E11D48" : "#9CA3AF"} />
              </View>
              <Text style={[styles.stepText, { color: step.active ? "#111827" : "#9CA3AF" }]}>{step.text}</Text>
              {step.active && <View style={styles.activeDot} />}
            </View>
          ))}
        </View>

        {isLoggedIn && (
          <View style={styles.earnCard}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#92400E" }}>
              Bạn vừa tích điểm cho đơn hàng này!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: isWeb ? 32 : insets.bottom + 16 }]}>
        {isLoggedIn && orderId ? (
          <Pressable
            style={({ pressed }) => [styles.trackBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push({ pathname: "/order-detail", params: { id: orderId } })}
          >
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Xem chi tiết đơn hàng</Text>
          </Pressable>
        ) : isLoggedIn ? (
          <Pressable
            style={({ pressed }) => [styles.trackBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push("/orders")}
          >
            <Ionicons name="list-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Xem lịch sử đơn hàng</Text>
          </Pressable>
        ) : (orderCode && phone) ? (
          <Pressable
            style={({ pressed }) => [styles.trackBtn, { opacity: pressed ? 0.9 : 1 }]}
            onPress={() => router.push({ pathname: "/track", params: { orderCode, phone } })}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Theo dõi đơn hàng</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.homeBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Ionicons name="home-outline" size={20} color="#111827" />
          <Text style={{ color: "#111827", fontSize: 15, fontWeight: "600" }}>Về trang chủ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: "center", paddingTop: 16 },
  iconCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", textAlign: "center" },
  desc: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 21 },
  codeCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", padding: 20, alignItems: "center", gap: 4 },
  codeLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.8 },
  codeValue: { fontSize: 28, fontWeight: "900", color: "#E11D48", letterSpacing: 2 },
  codeHint: { fontSize: 12, color: "#9CA3AF" },
  stepsCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" },
  step: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  stepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E11D48" },
  earnCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#FFFBEB", borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A" },
  actions: { padding: 14, paddingTop: 10, gap: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  trackBtn: { height: 52, borderRadius: 14, backgroundColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  homeBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
