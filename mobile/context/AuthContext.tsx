import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { router } from "expo-router"; 
import { apiService, setAuthToken } from "@/services/api";

const AUTH_KEY = "fastfood-auth-v1";

export interface AuthUser {
  user_id: number;
  full_name: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface AuthSession {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  requestOtp: (identifier: string) => Promise<{ verification_token: string; dev_otp?: string }>;
  verifyOtpLogin: (verificationToken: string, otp: string) => Promise<void>;
  register: (payload: { full_name: string; email: string; phone: string; password: string }) => Promise<{ verification_token: string; dev_otp?: string }>;
  verifyRegistration: (verificationToken: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((str) => {
        if (str) {
          const s = JSON.parse(str) as AuthSession;
          setSession(s);
          setAuthToken(s.token);
        }
      })
      .catch((e) => console.log("Lỗi khởi tạo Auth:", e))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await apiService.post("/auth/login", { identifier, password });
    const s = res.data as AuthSession;
    setSession(s);
    setAuthToken(s.token);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(s));
    router.replace("/(tabs)/account");
  }, []);

  const requestOtp = useCallback(async (identifier: string) => {
    const res = await apiService.post("/auth/otp-request", { identifier });
    return res.data as { verification_token: string; dev_otp?: string };
  }, []);

  const verifyOtpLogin = useCallback(async (verificationToken: string, otp: string) => {
    const res = await apiService.post("/auth/otp-verify", { verification_token: verificationToken, otp });
    const s = res.data as AuthSession;
    setSession(s);
    setAuthToken(s.token);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(s));
    router.replace("/(tabs)/account");
  }, []);

  const register = useCallback(async (payload: { full_name: string; email: string; phone: string; password: string }) => {
    const res = await apiService.post("/auth/register", payload);
    return res.data as { verification_token: string; dev_otp?: string };
  }, []);

  const verifyRegistration = useCallback(async (verificationToken: string, otp: string) => {
    const res = await apiService.post("/auth/register-verify", { verification_token: verificationToken, otp });
    const s = res.data as AuthSession;
    setSession(s);
    setAuthToken(s.token);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(s));
    router.replace("/(tabs)/account");
  }, []);

  const logout = useCallback(async () => {
    // 1. Lưu lại token ngầm hiện tại để gọi API trước khi clear State
    const currentToken = session?.token;

    // 2. Clear state lập tức giải phóng giao diện UI
    setSession(null);
    setAuthToken(null);
    
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.log("Lỗi xóa storage:", e);
    }
    
    // 3. Chuyển hướng chính xác vào cấu trúc Nhóm Tab
    try {
      router.replace("/(tabs)/account");
    } catch (routerError) {
      console.log("Lỗi điều hướng router:", routerError);
    }

    // 4. Gọi API xóa session/token trên Backend ngầm (Đường dẫn đúng: /auth/logout)
    if (currentToken) {
      apiService
        .post("/auth/logout", {}, { headers: { Authorization: `Bearer ${currentToken}` } })
        .catch((err) => {
          console.log("Gọi API logout ngầm lỗi (có thể bỏ qua):", err);
        });
    }
  }, [session]);

  const updateUser = useCallback(async (updates: Partial<AuthUser>) => {
    if (!session) return;
    const newSession: AuthSession = {
      ...session,
      user: { ...session.user, ...updates },
    };
    setSession(newSession);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newSession)).catch(() => {});
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoggedIn: !!session,
        isLoading,
        login,
        requestOtp,
        verifyOtpLogin,
        register,
        verifyRegistration,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được bọc trong AuthProvider");
  return context;
}