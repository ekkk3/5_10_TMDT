import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { apiService, formatVND } from "@/services/api";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=480&q=80";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const {
    items,
    totalQuantity,
    subtotal,
    appliedVoucher,
    discountAmount,
    finalTotal,
    updateQuantity,
    removeItem,
    clearCart,
    applyVoucher,
    removeVoucher,
  } = useCart();

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) { setVoucherError("Vui lòng nhập mã voucher"); return; }
    try {
      setVoucherLoading(true);
      setVoucherError("");
      const res = await apiService.post("/vouchers/apply-public", { code, orderTotal: subtotal });
      applyVoucher({ code, ...res.data });
      setVoucherCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: any) {
      removeVoucher();
      setVoucherError(err?.message || "Mã voucher không hợp lệ");
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveItem = (id: string, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Bỏ "${name}" khỏi giỏ hàng?`)) removeItem(id);
      return;
    }
    Alert.alert("Xóa món", `Bỏ "${name}" khỏi giỏ hàng?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xóa", style: "destructive",
        onPress: () => { removeItem(id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
      },
    ]);
  };

  const handleClearCart = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Bạn muốn xóa toàn bộ giỏ hàng?")) clearCart();
      return;
    }
    Alert.alert("Xóa giỏ hàng", "Bạn muốn xóa toàn bộ giỏ hàng?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Xóa tất cả", style: "destructive", onPress: clearCart },
    ]);
  };

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
          <Text style={styles.headerTitle}>Giỏ hàng</Text>
        </View>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={56} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={styles.emptyDesc}>Chọn món trong thực đơn để thêm vào giỏ hàng</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/menu")}>
            <Ionicons name="restaurant" size={17} color="#fff" />
            <Text style={styles.emptyBtnText}>Xem thực đơn</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Text style={styles.headerTitle}>Giỏ hàng ({totalQuantity})</Text>
        <Pressable onPress={handleClearCart}>
          <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600" }}>Xóa tất cả</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.cart_item_id}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: isWeb ? 220 : insets.bottom + 220 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cartCard}>
            <Image
              source={{ uri: item.image_url || FALLBACK_IMAGE }}
              style={styles.cartImg}
              contentFit="cover"
            />
            <View style={styles.cartInfo}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                <Text style={styles.cartName} numberOfLines={2}>{item.food_name}</Text>
                <Text style={{ color: "#E11D48", fontSize: 15, fontWeight: "800" }}>
                  {formatVND(item.item_total)}
                </Text>
              </View>
              {item.selected_options.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
                  {item.selected_options.map((o) => (
                    <View key={o.option_id} style={styles.optTag}>
                      <Text style={{ color: "#E11D48", fontSize: 11, fontWeight: "600" }}>
                        {o.option_name}{o.extra_price > 0 ? ` +${formatVND(o.extra_price)}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {item.note ? (
                <Text style={{ color: "#6B7280", fontSize: 12, fontStyle: "italic", marginBottom: 6 }}>
                  Ghi chú: {item.note}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                <View style={styles.qtyControl}>
                  <Pressable 
                    style={styles.qtyBtn}
                    onPress={() => { 
                      if (item.quantity === 1) {
                        // Nếu số lượng bằng 1 mà ấn trừ tiếp thì gọi hàm hỏi xóa món
                        handleRemoveItem(item.cart_item_id, item.food_name);
                      } else {
                        // Nếu lớn hơn 1 thì giảm số lượng như bình thường
                        updateQuantity(item.cart_item_id, item.quantity - 1); 
                        Haptics.selectionAsync().catch(() => {}); 
                      }
                    }}
                  >
                    <Ionicons name="remove" size={16} color="#111827" />
                  </Pressable>
                  <Text style={styles.qtyNum}>{item.quantity}</Text>
                  <Pressable style={styles.qtyBtn}
                    onPress={() => { updateQuantity(item.cart_item_id, item.quantity + 1); Haptics.selectionAsync().catch(() => {}); }}>
                    <Ionicons name="add" size={16} color="#111827" />
                  </Pressable>
                </View>
                <Pressable
                  style={styles.trashBtn}
                  onPress={() => handleRemoveItem(item.cart_item_id, item.food_name)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 10, paddingTop: 2 }}>
            {/* Voucher */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>MÃ GIẢM GIÁ</Text>
              {appliedVoucher ? (
                <View style={styles.appliedVoucher}>
                  <View>
                    <Text style={{ color: "#16A34A", fontSize: 15, fontWeight: "800" }}>{appliedVoucher.code}</Text>
                    <Text style={{ color: "#16A34A", fontSize: 13 }}>Giảm {formatVND(appliedVoucher.discount_amount)}</Text>
                  </View>
                  <Pressable onPress={removeVoucher}>
                    <Ionicons name="close-circle" size={22} color="#16A34A" />
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.voucherInput, { borderColor: voucherError ? "#EF4444" : "#E5E7EB" }]}
                      placeholder="Nhập mã voucher"
                      placeholderTextColor="#9CA3AF"
                      value={voucherCode}
                      onChangeText={(t) => { setVoucherCode(t.toUpperCase()); setVoucherError(""); }}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onSubmitEditing={handleApplyVoucher}
                    />
                    <Pressable style={styles.applyBtn} onPress={handleApplyVoucher} disabled={voucherLoading}>
                      {voucherLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Áp dụng</Text>}
                    </Pressable>
                  </View>
                  {voucherError ? <Text style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>{voucherError}</Text> : null}
                </>
              )}
            </View>

            {/* Summary */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>TỔNG KẾT ĐƠN HÀNG</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Tạm tính</Text>
                <Text style={styles.summaryVal}>{formatVND(subtotal)}</Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Giảm giá</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#16A34A" }}>-{formatVND(discountAmount)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Phí giao hàng</Text>
                <Text style={{ fontSize: 14, color: "#6B7280" }}>Tính khi đặt hàng</Text>
              </View>
              <View style={styles.summaryTotal}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Tổng cộng</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#E11D48" }}>{formatVND(finalTotal)}</Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.checkoutBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => router.push("/checkout")}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Đặt hàng ngay</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => router.push("/(tabs)/menu")}
            >
              <Text style={{ color: "#111827", fontSize: 15, fontWeight: "600" }}>+ Thêm món</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E11D48", paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cartCard: { flexDirection: "row", gap: 12, padding: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6" },
  cartImg: { width: 84, height: 84, borderRadius: 10 },
  cartInfo: { flex: 1 },
  cartName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827", lineHeight: 19 },
  optTag: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#FFF1F2", borderRadius: 6, borderWidth: 1, borderColor: "#FECDD3" },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 10, overflow: "hidden" },
  qtyBtn: { padding: 8 },
  qtyNum: { minWidth: 28, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#111827" },
  trashBtn: { padding: 8, borderRadius: 10, backgroundColor: "#FEF2F2" },
  sectionCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 10 },
  appliedVoucher: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#F0FDF4", borderRadius: 10, borderWidth: 1, borderColor: "#86EFAC" },
  voucherInput: { flex: 1, height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, fontWeight: "700", letterSpacing: 1, color: "#111827", backgroundColor: "#F9FAFB" },
  applyBtn: { paddingHorizontal: 16, height: 44, borderRadius: 10, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center", minWidth: 90 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryKey: { fontSize: 15, color: "#6B7280" },
  summaryVal: { fontSize: 15, fontWeight: "600", color: "#111827" },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  checkoutBtn: { height: 54, borderRadius: 14, backgroundColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  continueBtn: { height: 46, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
});