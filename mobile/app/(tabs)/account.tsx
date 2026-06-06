import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useAuth } from "@/context/AuthContext";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const { user, isLoggedIn, isLoading, login, logout, register, requestOtp, verifyOtpLogin, verifyRegistration } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "otp-login" | "otp-verify-register">("login");
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputStyle = [styles.input, { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", color: "#111827" }];

  const handleLogin = async () => {
    setError(""); setSuccess("");
    if (!identifier.trim()) { setError("Vui lòng nhập email hoặc số điện thoại"); return; }
    try {
      setSubmitting(true);
      if (loginMode === "password") {
        if (!password) { setError("Vui lòng nhập mật khẩu"); return; }
        await login(identifier.trim(), password);
      } else {
        const res = await requestOtp(identifier.trim());
        setVerificationToken(res.verification_token);
        if (res.dev_otp) setSuccess(`Mã OTP demo: ${res.dev_otp}`);
        else setSuccess("Mã OTP đã được gửi. Vui lòng kiểm tra email/điện thoại.");
        setMode("otp-login");
      }
    } catch (err: any) {
      setError(err?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(""); setSuccess("");
    if (!/^\d{6}$/.test(otp.trim())) { setError("Mã OTP gồm 6 chữ số"); return; }
    try {
      setSubmitting(true);
      await verifyOtpLogin(verificationToken, otp.trim());
    } catch (err: any) {
      setError(err?.message || "Xác thực OTP thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setError(""); setSuccess("");
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setError("Vui lòng điền đầy đủ thông tin"); return;
    }
    try {
      setSubmitting(true);
      const res = await register({ full_name: regName.trim(), email: regEmail.trim(), phone: regPhone.trim(), password: regPassword });
      setVerificationToken(res.verification_token);
      if (res.dev_otp) setSuccess(`Mã OTP demo: ${res.dev_otp}`);
      else setSuccess("Mã OTP đã gửi. Kiểm tra email/điện thoại.");
      setMode("otp-verify-register");
    } catch (err: any) {
      setError(err?.message || "Đăng ký thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyRegister = async () => {
    setError(""); setSuccess("");
    if (!/^\d{6}$/.test(otp.trim())) { setError("Mã OTP gồm 6 chữ số"); return; }
    try {
      setSubmitting(true);
      await verifyRegistration(verificationToken, otp.trim());
      await login(regEmail.trim(), regPassword);
    } catch (err: any) {
      setError(err?.message || "Xác thực thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Bạn có chắc muốn đăng xuất?")) logout();
      return;
    }
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Huỷ", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F5F5" }}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  if (isLoggedIn && user) {
    const menuSections = [
      {
        title: "Đơn hàng",
        items: [
          { icon: "receipt-outline" as const, label: "Lịch sử đơn hàng", sub: "Xem và theo dõi các đơn đã đặt", onPress: () => router.push("/orders") },
          { icon: "search-outline" as const, label: "Theo dõi đơn (khách)", sub: "Tra cứu bằng mã + SĐT", onPress: () => router.push("/track") },
        ],
      },
      {
        title: "Ưu đãi",
        items: [
          { icon: "ticket-outline" as const, label: "Ví Voucher", sub: "Các voucher của bạn", onPress: () => router.push("/vouchers") },
          { icon: "star-outline" as const, label: "Điểm tích luỹ", sub: "Đổi điểm lấy ưu đãi", onPress: () => router.push("/points") },
        ],
      },
      {
        title: "Tài khoản",
        items: [
          { icon: "location-outline" as const, label: "Sổ địa chỉ", sub: "Quản lý địa chỉ giao hàng", onPress: () => router.push("/addresses") },
          { icon: "headset-outline" as const, label: "Hỗ trợ khách hàng", sub: "Liên hệ & FAQ", onPress: () => router.push("/support") },
        ],
      },
    ];

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F5F5F5" }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWeb ? 100 : insets.bottom + 80 }}
      >
        {/* Red profile header */}
        <LinearGradient
          colors={["#E11D48", "#C01038"]}
          style={[styles.profileHeader, { paddingTop: topPad + (isWeb ? 24 : 16) }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.full_name || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>{user.full_name}</Text>
          <Text style={styles.profileEmail}>{user.email || user.phone || ""}</Text>
          <Pressable
            style={({ pressed }) => [styles.editProfileBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/profile-edit")}
          >
            <Ionicons name="pencil-outline" size={14} color="#E11D48" />
            <Text style={{ color: "#E11D48", fontSize: 13, fontWeight: "700" }}>Sửa hồ sơ</Text>
          </Pressable>
        </LinearGradient>

        <View style={{ padding: 14, gap: 14 }}>
          {menuSections.map((section) => (
            <View key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, i) => (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [
                      styles.menuItem,
                      i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={styles.menuIconWrap}>
                      <Ionicons name={item.icon} size={20} color="#E11D48" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{item.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable
            style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "700" }}>Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Not logged in — show auth forms
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F5F5F5" }}
      contentContainerStyle={{ paddingBottom: isWeb ? 100 : insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, { paddingTop: topPad + (isWeb ? 16 : 8) }]}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <View style={styles.authBox}>
        <Text style={styles.authTitle}>
          {mode === "register" || mode === "otp-verify-register" ? "Tạo tài khoản" : "Đăng nhập"}
        </Text>
        <Text style={styles.authDesc}>
          {mode === "register" ? "Điền thông tin để tạo tài khoản mới"
            : mode === "otp-login" || mode === "otp-verify-register" ? "Nhập mã OTP được gửi đến email/điện thoại"
            : "Đăng nhập để đặt hàng và theo dõi đơn"}
        </Text>

        {error ? (
          <View style={styles.alertError}>
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "600", lineHeight: 20 }}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.alertSuccess}>
            <Text style={{ color: "#16A34A", fontSize: 14, fontWeight: "600", lineHeight: 20 }}>{success}</Text>
          </View>
        ) : null}

        {mode === "login" && (
          <>
            <View style={styles.modeTabs}>
              <Pressable
                style={[styles.modeTab, loginMode === "password" && styles.modeTabActive]}
                onPress={() => { setLoginMode("password"); setError(""); setSuccess(""); }}
              >
                <Text style={[styles.modeTabText, loginMode === "password" && { color: "#fff" }]}>Mật khẩu</Text>
              </Pressable>
              <Pressable
                style={[styles.modeTab, loginMode === "otp" && styles.modeTabActive]}
                onPress={() => { setLoginMode("otp"); setError(""); setSuccess(""); }}
              >
                <Text style={[styles.modeTabText, loginMode === "otp" && { color: "#fff" }]}>Mã OTP</Text>
              </Pressable>
            </View>
            <TextInput style={inputStyle} placeholder="Email hoặc số điện thoại" placeholderTextColor="#9CA3AF" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" />
            {loginMode === "password" && (
              <TextInput style={inputStyle} placeholder="Mật khẩu" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
            )}
            <Pressable style={styles.submitBtn} onPress={handleLogin} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{loginMode === "otp" ? "Gửi OTP" : "Đăng nhập"}</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode("register"); setError(""); setSuccess(""); }}>
              <Text style={styles.switchText}>Chưa có tài khoản? <Text style={{ color: "#E11D48", fontWeight: "700" }}>Đăng ký ngay</Text></Text>
            </Pressable>
          </>
        )}

        {mode === "otp-login" && (
          <>
            <TextInput style={inputStyle} placeholder="Nhập mã OTP 6 chữ số" placeholderTextColor="#9CA3AF" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
            <Pressable style={styles.submitBtn} onPress={handleVerifyOtp} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Xác thực OTP</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode("login"); setError(""); setSuccess(""); setOtp(""); }}>
              <Text style={[styles.switchText, { color: "#E11D48", fontWeight: "700" }]}>← Quay lại</Text>
            </Pressable>
          </>
        )}

        {mode === "register" && (
          <>
            <TextInput style={inputStyle} placeholder="Họ và tên" placeholderTextColor="#9CA3AF" value={regName} onChangeText={setRegName} />
            <TextInput style={inputStyle} placeholder="Email" placeholderTextColor="#9CA3AF" value={regEmail} onChangeText={setRegEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={inputStyle} placeholder="Số điện thoại" placeholderTextColor="#9CA3AF" value={regPhone} onChangeText={setRegPhone} keyboardType="phone-pad" />
            <TextInput style={inputStyle} placeholder="Mật khẩu" placeholderTextColor="#9CA3AF" value={regPassword} onChangeText={setRegPassword} secureTextEntry />
            <Pressable style={styles.submitBtn} onPress={handleRegister} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Đăng ký</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode("login"); setError(""); setSuccess(""); }}>
              <Text style={styles.switchText}>Đã có tài khoản? <Text style={{ color: "#E11D48", fontWeight: "700" }}>Đăng nhập</Text></Text>
            </Pressable>
          </>
        )}

        {mode === "otp-verify-register" && (
          <>
            <TextInput style={inputStyle} placeholder="Nhập mã OTP 6 chữ số" placeholderTextColor="#9CA3AF" value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} />
            <Pressable style={styles.submitBtn} onPress={handleVerifyRegister} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Xác nhận tài khoản</Text>}
            </Pressable>
          </>
        )}

        <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
        <Pressable
          style={({ pressed }) => [styles.guestTrack, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push("/track")}
        >
          <Ionicons name="search-outline" size={20} color="#E11D48" />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" }}>Theo dõi đơn không cần tài khoản</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  profileHeader: { alignItems: "center", paddingBottom: 28, paddingHorizontal: 20, gap: 4 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  profileName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  profileEmail: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  sectionCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#F3F4F6", overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  menuIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#EF4444" },
  authBox: { margin: 14, padding: 20, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F3F4F6", gap: 12 },
  authTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  authDesc: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  alertError: { padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  alertSuccess: { padding: 12, borderRadius: 12, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC" },
  modeTabs: { flexDirection: "row", padding: 3, backgroundColor: "#F3F4F6", borderRadius: 12 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  modeTabActive: { backgroundColor: "#E11D48" },
  modeTabText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  input: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: "#E11D48", alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  switchText: { textAlign: "center", fontSize: 14, color: "#6B7280" },
  guestTrack: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#F9FAFB", borderRadius: 12, borderWidth: 1, borderColor: "#F3F4F6" },
});
