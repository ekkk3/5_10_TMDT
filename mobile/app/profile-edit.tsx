import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { user, updateUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!fullName.trim()) { setError("Vui lòng nhập họ và tên"); return; }
    try {
      setSaving(true);
      const res = await apiService.patch("/account/profile", {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      await updateUser(res.data || { full_name: fullName.trim(), phone: phone.trim() });
      setSuccess("Cập nhật hồ sơ thành công!");
      setTimeout(() => router.back(), 900);
    } catch (err: any) {
      setError(err?.message || "Không thể cập nhật hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Sửa hồ sơ</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{(fullName || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>Ảnh đại diện từ chữ cái đầu tên</Text>
        </View>

        {error ? (
          <View style={styles.alertErr}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600", flex: 1 }}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.alertOk}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#16A34A" />
            <Text style={{ color: "#16A34A", fontSize: 14, fontWeight: "600", flex: 1 }}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#9CA3AF"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="0901234567"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Email</Text>
          <View style={[styles.input, { backgroundColor: "#F3F4F6", justifyContent: "center" }]}>
            <Text style={{ fontSize: 15, color: "#9CA3AF" }}>{user?.email || "—"}</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Email không thể thay đổi sau khi đăng ký</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Lưu thay đổi</Text>
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
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  alertErr: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  alertOk: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  input: { height: 50, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, fontSize: 15, backgroundColor: "#F9FAFB", color: "#111827" },
  saveBtn: { height: 54, borderRadius: 14, backgroundColor: "#E11D48", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
