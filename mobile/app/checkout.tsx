import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { apiService, estimateDeliveryFee, formatVND } from "@/services/api";

interface SavedAddress {
  address_id: number;
  label?: string;
  full_address: string;
  is_default: boolean;
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { items, subtotal, discountAmount, appliedVoucher, clearCart, finalTotal } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.full_name) setName(user.full_name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (isLoggedIn) {
      setLoadingAddresses(true);
      apiService.get("/account/addresses")
        .then((res) => {
          const addrs: SavedAddress[] = res.data || [];
          setSavedAddresses(addrs);
          const def = addrs.find((a) => a.is_default);
          if (def && !address) setAddress(def.full_address);
        })
        .catch(() => {})
        .finally(() => setLoadingAddresses(false));
    }
  }, [isLoggedIn]);

  const deliveryFee = estimateDeliveryFee(address);
  const total = finalTotal + deliveryFee;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Vui lòng nhập họ tên";
    if (!isLoggedIn) {
      const normalPhone = phone.trim().replace(/[\s.-]/g, "");
      if (!normalPhone) e.phone = "Vui lòng nhập số điện thoại";
      else if (!/^(0\d{9}|\+84\d{9})$/.test(normalPhone)) e.phone = "Số điện thoại không đúng định dạng";
    }
    if (!address.trim()) e.address = "Vui lòng nhập địa chỉ giao hàng";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!items.length) { setSubmitError("Giỏ hàng trống"); return; }
    try {
      setSubmitting(true);
      setSubmitError("");
      const fee = estimateDeliveryFee(address);
      const orderItems = items.map((item) => ({
        food_id: item.food_id,
        quantity: item.quantity,
        note: item.note,
        selected_options: item.selected_options.map((o) => ({ option_id: o.option_id, quantity: 1 })),
      }));

      let res;
      if (isLoggedIn) {
        res = await apiService.post("/account/orders", {
          delivery_address: address.trim(),
          note: note.trim(),
          items: orderItems,
          voucher_code: appliedVoucher?.code,
          payment_method: "COD",
          subtotal,
          delivery_fee: fee,
          total_amount: Math.max(0, finalTotal + fee),
        });
      } else {
        res = await apiService.post("/orders/guest", {
          guest_name: name.trim(),
          guest_phone: phone.trim(),
          guest_address: address.trim(),
          note: note.trim(),
          items: orderItems,
          applied_voucher: appliedVoucher,
          subtotal,
          discount_amount: discountAmount,
          delivery_fee: fee,
          total_amount: Math.max(0, finalTotal + fee),
          payment_method: "COD",
        });
      }

      clearCart();
      router.replace({
        pathname: "/order-result",
        params: {
          orderCode: res.data?.order_code || "",
          phone: phone.trim(),
          orderId: res.data?.order_id ? String(res.data.order_id) : "",
        },
      });
    } catch (err: any) {
      const serverErrors = err?.errors && typeof err.errors === "object" ? err.errors : {};
      setErrors(serverErrors);
      setSubmitError(err?.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputFor = (field: string) => [
    styles.input,
    { borderColor: errors[field] ? "#EF4444" : "#E5E7EB", backgroundColor: "#F9FAFB", color: "#111827" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Đặt hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Address picker modal for logged-in users */}
      <Modal
        visible={showAddrPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddrPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddrPicker(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Chọn địa chỉ giao hàng</Text>
            {savedAddresses.length === 0 ? (
              <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
                <Ionicons name="location-outline" size={40} color="#D1D5DB" />
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Chưa có địa chỉ đã lưu</Text>
                <Pressable
                  style={[styles.redBtn, { flexDirection: "row", gap: 6 }]}
                  onPress={() => { setShowAddrPicker(false); router.push("/addresses"); }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Thêm địa chỉ</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {savedAddresses.map((addr) => (
                  <Pressable
                    key={addr.address_id}
                    style={({ pressed }) => [styles.addrOption, { opacity: pressed ? 0.8 : 1 }, addr.full_address === address && styles.addrOptionActive]}
                    onPress={() => { setAddress(addr.full_address); setErrors((e) => ({ ...e, address: "" })); setShowAddrPicker(false); }}
                  >
                    <Ionicons name="location" size={18} color={addr.full_address === address ? "#E11D48" : "#9CA3AF"} />
                    <View style={{ flex: 1 }}>
                      {addr.label ? <Text style={{ fontSize: 12, fontWeight: "700", color: "#9CA3AF" }}>{addr.label}</Text> : null}
                      <Text style={{ fontSize: 14, color: "#111827", fontWeight: "500" }}>{addr.full_address}</Text>
                    </View>
                    {addr.is_default && (
                      <View style={{ backgroundColor: "#FFF1F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: "#E11D48", fontSize: 11, fontWeight: "700" }}>Mặc định</Text>
                      </View>
                    )}
                    {addr.full_address === address && <Ionicons name="checkmark-circle" size={20} color="#E11D48" />}
                  </Pressable>
                ))}
                <Pressable
                  style={styles.addAddrBtn}
                  onPress={() => { setShowAddrPicker(false); router.push("/addresses"); }}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#E11D48" />
                  <Text style={{ color: "#E11D48", fontWeight: "600", fontSize: 14 }}>Thêm địa chỉ mới</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: isWeb ? 120 : insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoggedIn && user && (
          <View style={styles.memberBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#16A34A" }}>
              Đặt hàng với tài khoản <Text style={{ fontWeight: "800" }}>{user.full_name}</Text> — được tích điểm!
            </Text>
          </View>
        )}

        {submitError ? (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600", flex: 1 }}>{submitError}</Text>
          </View>
        ) : null}

        {/* Delivery info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📦 Thông tin giao hàng</Text>

          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            style={inputFor("name")}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
          />
          {errors.name ? <Text style={styles.fieldErr}>{errors.name}</Text> : null}

          {!isLoggedIn && (
            <>
              <Text style={styles.label}>Số điện thoại *</Text>
              <TextInput
                style={inputFor("phone")}
                placeholder="0901234567"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
                keyboardType="phone-pad"
              />
              {errors.phone ? <Text style={styles.fieldErr}>{errors.phone}</Text> : null}
            </>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <Text style={styles.label}>Địa chỉ giao hàng *</Text>
            {isLoggedIn && (
              <Pressable
                style={styles.pickAddrBtn}
                onPress={() => setShowAddrPicker(true)}
              >
                {loadingAddresses
                  ? <ActivityIndicator size="small" color="#E11D48" />
                  : <><Ionicons name="location-outline" size={14} color="#E11D48" /><Text style={{ color: "#E11D48", fontSize: 12, fontWeight: "700" }}>Chọn địa chỉ</Text></>
                }
              </Pressable>
            )}
          </View>
          <TextInput
            style={[inputFor("address"), { height: 72, paddingTop: 12, textAlignVertical: "top" }]}
            placeholder="123 Nguyễn Trãi, Quận 1, TP.HCM"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
            multiline
            numberOfLines={2}
          />
          {errors.address ? <Text style={styles.fieldErr}>{errors.address}</Text> : null}
          {deliveryFee > 0 && (
            <View style={styles.feeHint}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
              <Text style={{ color: "#16A34A", fontSize: 13, fontWeight: "600" }}>
                Phí giao hàng khu vực này: {formatVND(deliveryFee)}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            style={[inputFor("note"), { height: 60, paddingTop: 10, textAlignVertical: "top" }]}
            placeholder="Ghi chú cho tài xế..."
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Thanh toán</Text>
          <View style={styles.payOption}>
            <View style={styles.payIconWrap}>
              <Ionicons name="cash-outline" size={20} color="#E11D48" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" }}>
              Tiền mặt khi nhận hàng (COD)
            </Text>
            <Ionicons name="checkmark-circle" size={20} color="#E11D48" />
          </View>
        </View>

        {/* Order summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧾 Tóm tắt đơn hàng</Text>
          {items.map((item) => (
            <View key={item.cart_item_id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 14, color: "#6B7280" }} numberOfLines={1}>
                {item.food_name} x{item.quantity}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{formatVND(item.item_total)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 }} />
          <View style={styles.sumRow}>
            <Text style={styles.sumKey}>Tạm tính</Text>
            <Text style={styles.sumVal}>{formatVND(subtotal)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.sumRow}>
              <Text style={styles.sumKey}>Giảm giá</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#16A34A" }}>-{formatVND(discountAmount)}</Text>
            </View>
          )}
          <View style={styles.sumRow}>
            <Text style={styles.sumKey}>Phí giao hàng</Text>
            <Text style={{ fontSize: 15, color: deliveryFee > 0 ? "#111827" : "#9CA3AF" }}>
              {deliveryFee > 0 ? formatVND(deliveryFee) : "Tính theo khu vực"}
            </Text>
          </View>
          <View style={styles.sumTotal}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>Tổng cộng</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#E11D48" }}>{formatVND(total)}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.confirmBtn, { opacity: pressed ? 0.9 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>Xác nhận đặt hàng</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  memberBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC" },
  alertError: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  pickAddrBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, height: 50 },
  fieldErr: { fontSize: 12, color: "#EF4444", marginTop: -4 },
  feeHint: { flexDirection: "row", alignItems: "center", gap: 6 },
  payOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#E11D48", backgroundColor: "#FFF1F2" },
  payIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  sumKey: { fontSize: 15, color: "#6B7280" },
  sumVal: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sumTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  confirmBtn: { height: 56, borderRadius: 14, backgroundColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12, maxHeight: "80%" },
  modalHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  addrOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  addrOptionActive: { borderColor: "#E11D48", backgroundColor: "#FFF1F2" },
  addAddrBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#E11D48", borderStyle: "dashed" },
  redBtn: { backgroundColor: "#E11D48", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
