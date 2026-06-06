import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiService } from "@/services/api";

interface Address {
  address_id: number;
  label?: string;
  full_address: string;
  is_default: boolean;
}

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiService.get("/account/addresses");
      setAddresses(res.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách địa chỉ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAddresses(); }, []);

  const openAdd = () => { setEditingId(null); setLabel(""); setFullAddress(""); setShowForm(true); };
  const openEdit = (addr: Address) => { setEditingId(addr.address_id); setLabel(addr.label || ""); setFullAddress(addr.full_address); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setLabel(""); setFullAddress(""); };

  const handleSave = async () => {
    if (!fullAddress.trim()) { Alert.alert("Lỗi", "Vui lòng nhập địa chỉ"); return; }
    try {
      setSaving(true);
      const payload = { label: label.trim() || undefined, full_address: fullAddress.trim() };
      if (editingId) {
        await apiService.patch(`/account/addresses/${editingId}`, payload);
      } else {
        await apiService.post("/account/addresses", payload);
      }
      closeForm();
      await fetchAddresses();
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể lưu địa chỉ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Xoá địa chỉ", "Bạn có chắc muốn xoá địa chỉ này?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá", style: "destructive",
        onPress: async () => {
          try {
            await apiService.delete(`/account/addresses/${id}`);
            await fetchAddresses();
          } catch (err: any) {
            Alert.alert("Lỗi", err?.message || "Không thể xoá địa chỉ");
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: number) => {
    try {
      await apiService.patch(`/account/addresses/${id}/default`, {});
      await fetchAddresses();
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể đặt địa chỉ mặc định");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Sổ địa chỉ</Text>
        <Pressable style={styles.addHeaderBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#E11D48" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhãn (vd: Nhà, Văn phòng)"
              placeholderTextColor="#9CA3AF"
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={[styles.input, { height: 80, paddingTop: 12, textAlignVertical: "top" }]}
              placeholder="Địa chỉ đầy đủ *"
              placeholderTextColor="#9CA3AF"
              value={fullAddress}
              onChangeText={setFullAddress}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={styles.cancelFormBtn} onPress={closeForm}>
                <Text style={{ color: "#6B7280", fontWeight: "600" }}>Huỷ</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Lưu</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* Address list */}
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#E11D48" />
          </View>
        ) : error ? (
          <View style={styles.errWrap}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 14, textAlign: "center" }}>{error}</Text>
          </View>
        ) : addresses.length === 0 && !showForm ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="location-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Chưa có địa chỉ</Text>
            <Text style={styles.emptyDesc}>Thêm địa chỉ để thanh toán nhanh hơn</Text>
            <Pressable style={styles.addFirstBtn} onPress={openAdd}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700" }}>Thêm địa chỉ</Text>
            </Pressable>
          </View>
        ) : (
          addresses.map((addr) => (
            <View key={addr.address_id} style={[styles.addrCard, addr.is_default && { borderColor: "#E11D48" }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 }}>
                <View style={[styles.locIcon, { backgroundColor: addr.is_default ? "#FFF1F2" : "#F3F4F6" }]}>
                  <Ionicons name="location" size={18} color={addr.is_default ? "#E11D48" : "#6B7280"} />
                </View>
                <View style={{ flex: 1 }}>
                  {addr.label ? <Text style={styles.addrLabel}>{addr.label}</Text> : null}
                  <Text style={styles.addrText}>{addr.full_address}</Text>
                  {addr.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={{ color: "#E11D48", fontSize: 11, fontWeight: "700" }}>Mặc định</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.addrActions}>
                {!addr.is_default && (
                  <Pressable style={styles.actionBtn} onPress={() => handleSetDefault(addr.address_id)}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
                  </Pressable>
                )}
                <Pressable style={styles.actionBtn} onPress={() => openEdit(addr)}>
                  <Ionicons name="pencil-outline" size={20} color="#6B7280" />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => handleDelete(addr.address_id)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {!showForm && addresses.length > 0 && (
          <Pressable style={styles.addMoreBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#E11D48" />
            <Text style={{ color: "#E11D48", fontWeight: "700", fontSize: 15 }}>Thêm địa chỉ mới</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  addHeaderBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  formCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, gap: 10 },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: "#F9FAFB", color: "#111827", height: 50 },
  cancelFormBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  saveBtn: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" },
  errWrap: { alignItems: "center", gap: 10, padding: 32 },
  emptyWrap: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptyDesc: { fontSize: 14, color: "#6B7280" },
  addFirstBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E11D48", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  addrCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  locIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addrLabel: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 2 },
  addrText: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  defaultBadge: { marginTop: 4, backgroundColor: "#FFF1F2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  addrActions: { flexDirection: "row", gap: 4 },
  actionBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  addMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#E11D48", borderStyle: "dashed" },
});
