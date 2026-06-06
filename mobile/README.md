# 🍔 FastFood Mobile App

Ứng dụng đặt đồ ăn nhanh trên điện thoại, xây dựng bằng **React Native + Expo**. Kết nối với backend Express + MySQL của dự án web gốc.

---

## 📱 Tính năng

| Màn hình | Mô tả |
|---|---|
| 🏠 Trang chủ | Hero banner, món nổi bật, thông tin cửa hàng |
| 🍽️ Thực đơn | Tìm kiếm, lọc danh mục, xem chi tiết món |
| 🛒 Giỏ hàng | Thêm/xóa món, nhập mã voucher, tính tổng |
| 📝 Chi tiết món | Chọn options (size, topping), số lượng, ghi chú |
| 🚚 Đặt hàng | Form giao hàng, thanh toán COD |
| 📦 Theo dõi đơn | Tra cứu trạng thái đơn bằng mã + SĐT |
| 👤 Tài khoản | Đăng nhập/đăng ký, xác thực OTP |
| 💬 Hỗ trợ | FAQ, hotline, gửi yêu cầu hỗ trợ |

---

## 🗂️ Cấu trúc project

```
fastfood-mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab bar (4 tabs)
│   │   ├── index.tsx         # Trang chủ
│   │   ├── menu.tsx          # Thực đơn
│   │   ├── cart.tsx          # Giỏ hàng
│   │   └── account.tsx       # Tài khoản
│   ├── food/[id].tsx         # Chi tiết món (modal)
│   ├── checkout.tsx          # Đặt hàng
│   ├── order-result.tsx      # Kết quả đơn hàng
│   ├── track.tsx             # Theo dõi đơn
│   ├── support.tsx           # Hỗ trợ
│   └── _layout.tsx           # Root layout
├── context/
│   ├── CartContext.tsx        # Quản lý giỏ hàng (AsyncStorage)
│   └── AuthContext.tsx        # Quản lý đăng nhập (AsyncStorage)
├── services/
│   └── api.ts                 # Fetch wrapper, formatVND, deliveryFee
├── constants/
│   └── colors.ts              # Màu sắc theme (đỏ #E11D48)
└── .env                       # Biến môi trường (tự tạo, xem bên dưới)
```

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** >= 18 — https://nodejs.org
- **pnpm** — `npm install -g pnpm`
- **Git** — https://git-scm.com
- **Expo Go** trên điện thoại — App Store / Google Play
- Backend gốc đang chạy (Express + MySQL)

---

## 🚀 Cài đặt và chạy

### Bước 1 — Clone hoặc giải nén project

```bash
# Nếu dùng git
git clone https://github.com/your-username/fastfood-mobile.git
cd fastfood-mobile

# Nếu giải nén từ file .tar.gz
tar -xzf fastfood-mobile.tar.gz
cd fastfood-mobile/artifacts/fastfood-mobile
```

### Bước 2 — Tạo file `.env`

Tạo file `.env` trong thư mục `artifacts/fastfood-mobile/`:

```env
# Địa chỉ backend Express của bạn
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

> **Lưu ý:** Thay `localhost:3000` bằng IP/domain thực tế nếu backend chạy trên máy khác.  
> Nếu test trên điện thoại thật, dùng IP LAN của máy tính: `http://192.168.x.x:3000/api`

### Bước 3 — Cài packages

```bash
pnpm install
```

### Bước 4 — Chạy app

```bash
pnpm dev
```

Terminal sẽ hiển thị QR code và link:

```
› Metro waiting on exp://...
› Web is waiting on http://localhost:19486
› Scan the QR code above with Expo Go
```

### Bước 5 — Mở app

| Thiết bị | Cách mở |
|---|---|
| 📱 Android | Mở Expo Go → quét QR code |
| 🍎 iPhone | Mở Camera → quét QR → nhấn "Open in Expo Go" |
| 💻 Trình duyệt | Bấm `w` trong terminal hoặc vào `http://localhost:19486` |

---

## 🔗 Chạy cùng Backend

App mobile kết nối với backend Express gốc. Cần chạy cả 2 cùng lúc:

**Terminal 1 — Backend:**
```bash
cd path/to/5_10_TMDT/backend
npm install
npm start
# ✅ Server running on port 3000
```

**Terminal 2 — Mobile app:**
```bash
cd path/to/fastfood-mobile/artifacts/fastfood-mobile
pnpm dev
# ✅ QR code xuất hiện
```

---

## 🔌 API Endpoints sử dụng

App gọi các endpoints sau từ backend gốc:

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/menu/categories` | Danh mục món |
| GET | `/api/menu/foods` | Danh sách món (có filter) |
| GET | `/api/menu/foods/:id` | Chi tiết món |
| GET | `/api/food-options/:foodId` | Options của món |
| POST | `/api/auth/login` | Đăng nhập bằng mật khẩu |
| POST | `/api/auth/login/request-otp` | Yêu cầu OTP |
| POST | `/api/auth/login/verify-otp` | Xác thực OTP đăng nhập |
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/register/verify` | Xác thực OTP đăng ký |
| POST | `/api/auth/logout` | Đăng xuất |
| POST | `/api/orders/guest` | Tạo đơn hàng khách |
| GET | `/api/orders/tracking` | Tra cứu đơn hàng |
| POST | `/api/vouchers/apply-public` | Áp dụng voucher |
| POST | `/api/support` | Gửi yêu cầu hỗ trợ |

---

## 🎨 Công nghệ sử dụng

| Package | Mục đích |
|---|---|
| `expo` ~54 | Framework React Native |
| `expo-router` | File-based navigation |
| `expo-linear-gradient` | Gradient hero banner |
| `expo-image` | Hiển thị ảnh tối ưu |
| `expo-haptics` | Phản hồi rung khi bấm |
| `@react-native-async-storage/async-storage` | Lưu giỏ hàng + đăng nhập |
| `@tanstack/react-query` | Quản lý API calls |
| `@expo/vector-icons` | Icon Ionicons |

---

## 🛠️ Lệnh hay dùng

```bash
pnpm dev          # Chạy app (development)
pnpm typecheck    # Kiểm tra TypeScript
```

---

## ❓ Xử lý lỗi thường gặp

**Lỗi: "Network request failed"**
→ Backend chưa chạy, hoặc `EXPO_PUBLIC_API_URL` sai địa chỉ.

**Lỗi khi test trên điện thoại thật (không phải máy ảo)**
→ Điện thoại và máy tính phải cùng mạng WiFi. Dùng IP LAN thay vì `localhost`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
```
Tìm IP LAN bằng: `ipconfig` (Windows) hoặc `ifconfig` (Mac/Linux)

**Lỗi: "pnpm: command not found"**
```bash
npm install -g pnpm
```

---

## 📄 Giấy phép

MIT — Tự do sử dụng cho học tập và phát triển.
