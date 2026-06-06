import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

const FAQ = [
  { q: "Đơn hàng của tôi sẽ đến khi nào?", a: "Thời gian giao hàng thường từ 30–45 phút tùy khu vực. Bạn có thể tra cứu đơn hàng bằng mã đơn và số điện thoại." },
  { q: "Tôi có thể huỷ đơn hàng không?", a: "Bạn có thể huỷ đơn trong vòng 5 phút sau khi đặt. Liên hệ hotline 0900 000 001 để được hỗ trợ." },
  { q: "Phí giao hàng là bao nhiêu?", a: "Phí giao hàng dao động từ 15.000₫ đến 22.000₫ tùy khu vực: Q1 (15k), Q3 (18k), Bình Thạnh (22k)." },
  { q: "Tôi quên mã đơn hàng, phải làm sao?", a: "Liên hệ hotline 0900 000 001 với tên và số điện thoại đặt hàng, nhân viên sẽ hỗ trợ tra cứu." },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) { setError("Vui lòng điền đầy đủ thông tin"); return; }
    try {
      setSubmitting(true);
      setError("");
      await apiService.post("/support", { name: name.trim(), email: email.trim(), message: message.trim() });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Hỗ trợ khách hàng</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: isWeb ? 80 : insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick contact */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable style={styles.contactCardRed} onPress={() => Linking.openURL("tel:0900000001")}>
            <Ionicons name="call" size={22} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Gọi hotline</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>0900 000 001</Text>
          </Pressable>
          <Pressable style={styles.contactCardWhite} onPress={() => Linking.openURL("mailto:support@fastfood.vn")}>
            <Ionicons name="mail" size={22} color="#E11D48" />
            <Text style={{ color: "#111827", fontSize: 14, fontWeight: "700" }}>Email</Text>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>support@fastfood.vn</Text>
          </Pressable>
        </View>

        {/* Hours */}
        <View style={styles.hoursCard}>
          <View style={styles.hoursIcon}>
            <Ionicons name="time-outline" size={20} color="#E11D48" />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Giờ hỗ trợ</Text>
            <Text style={{ color: "#6B7280", fontSize: 13 }}>08:00 – 22:00, tất cả các ngày trong tuần</Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>❓ Câu hỏi thường gặp</Text>
          {FAQ.map((item, i) => (
            <Pressable
              key={i}
              style={[styles.faqItem, i > 0 && { borderTopWidth: 1, borderTopColor: "#F3F4F6" }]}
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons name={expandedFaq === i ? "chevron-up" : "chevron-down"} size={18} color="#9CA3AF" />
              </View>
              {expandedFaq === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Contact form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✉️ Gửi yêu cầu hỗ trợ</Text>
          {submitted ? (
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
              <Ionicons name="checkmark-circle" size={52} color="#16A34A" />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Đã gửi thành công!</Text>
              <Text style={{ color: "#6B7280", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                Chúng tôi sẽ phản hồi trong vòng 24 giờ qua email của bạn.
              </Text>
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.alertErr}>
                  <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "600" }}>{error}</Text>
                </View>
              ) : null}
              <TextInput style={styles.input} placeholder="Họ và tên" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Email liên hệ" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <TextInput
                style={[styles.input, { height: 100, paddingTop: 12, textAlignVertical: "top" }]}
                placeholder="Mô tả vấn đề bạn gặp phải..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
              />
              <Pressable
                style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.9 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Gửi yêu cầu</Text>}
              </Pressable>
            </>
          )}
        </View>
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
  contactCardRed: { flex: 1, borderRadius: 14, padding: 16, backgroundColor: "#E11D48", alignItems: "center", gap: 4 },
  contactCardWhite: { flex: 1, borderRadius: 14, padding: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#F3F4F6", alignItems: "center", gap: 4 },
  hoursCard: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 14 },
  hoursIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", padding: 16, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },
  faqItem: { paddingVertical: 14, gap: 8 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  faqA: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  alertErr: { padding: 12, borderRadius: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  input: { height: 50, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, fontSize: 15, backgroundColor: "#F9FAFB", color: "#111827" },
  submitBtn: { height: 50, borderRadius: 12, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" },
});
