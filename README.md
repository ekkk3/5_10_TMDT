# Fast Food Ordering System

Hệ thống đặt món ăn nhanh cho đồ án Thương mại điện tử. Dự án gồm frontend HTML/CSS/JavaScript thuần, backend Node.js + Express và database MySQL.

## Tính Năng Chính

### Khách vãng lai

- Xem thực đơn, tìm kiếm, lọc món theo danh mục, khoảng giá và trạng thái còn/hết hàng.
- Xem chi tiết món, option/topping, rating và review.
- Quản lý giỏ hàng guest bằng `localStorage`: thêm món, tăng/giảm số lượng, xóa món, xóa toàn bộ giỏ, tính tạm tính.
- Kiểm tra lại giỏ hàng trước checkout để chặn món hết hàng, option không hợp lệ hoặc vượt tồn kho.
- Checkout không cần đăng nhập: nhập họ tên, SĐT, địa chỉ, ghi chú, chọn COD hoặc Online mock.
- Tạo đơn guest, trả mã đơn, lưu payment và log trạng thái.
- Tra cứu đơn bằng mã đơn + SĐT, xem timeline, trạng thái, chi tiết món và thông tin thanh toán.
- Hủy đơn guest bằng mã đơn + SĐT khi đơn còn `PENDING`.
- Áp voucher công khai trong giỏ hàng.

### Thành viên

- Đăng ký tài khoản bằng OTP mock.
- Đăng nhập bằng mật khẩu hoặc OTP mock.
- Đăng xuất và xem trang tài khoản.
- Trang tài khoản hiển thị hồ sơ cơ bản, điểm thành viên và khung sổ địa chỉ.

### Quản trị và vận hành

- Đăng nhập admin/staff bằng mật khẩu hoặc OTP mock.
- Phân quyền theo role: `ADMIN`, `MANAGER`, `KITCHEN`, `CSKH`, `MARKETING`, `DELIVERY`.
- Dashboard quản trị.
- Quản lý đơn hàng: list, filter, detail, xác nhận đơn, hủy đơn có lý do.
- KDS bếp: xem đơn `CONFIRMED`/`COOKING`, cập nhật `CONFIRMED -> COOKING -> READY`.
- Quản lý tài khoản nhân viên: xem danh sách, tạo/sửa, đổi role, khóa/mở khóa.

## Công Nghệ

- Frontend: HTML/CSS/JavaScript thuần, hash router.
- Backend: Node.js, Express.
- Database: MySQL 8.x.
- Auth: JWT, bcryptjs.
- Payment demo: COD và Online mock.
- OTP demo: mock OTP, trả `dev_otp` khi `NODE_ENV` khác `production`.

## Cấu Trúc Thư Mục

```text
backend/
  src/
    app.js                  Cấu hình Express app, route API và static frontend
    server.js               Entry point chạy server
    config/                 Cấu hình env và database
    common/                 Helper response, trạng thái đơn
    middlewares/            Middleware lỗi, auth admin
    modules/                Các module nghiệp vụ

frontend/
  src/
    index.html              File HTML chính
    main.js                 Bootstrap frontend
    routes/                 Hash router
    layouts/                Layout khách hàng/admin/auth
    features/               Các màn hình theo feature
    services/               API service, auth, cart, order
    contexts/               CartContext

database/
  schema.sql                Schema MySQL chính
  seeders/
    001_seed_sample_data.sql Dữ liệu mẫu: role, user, món, voucher, inventory, review

docs/
  api/                      Ghi chú API
  database/                 Ghi chú database và tài khoản mẫu
  demo-script.md            Script demo ngắn
```

## Yêu Cầu Môi Trường

- Node.js 18 trở lên.
- npm.
- MySQL 8.x hoặc tương đương.

## Cài Đặt Database

Mở MySQL client tại thư mục gốc project và chạy:

```sql
SOURCE database/schema.sql;
SOURCE database/seeders/001_seed_sample_data.sql;
```

`database/schema.sql` sẽ tạo database `fast_food_system` và toàn bộ bảng cần thiết. Seeder thêm dữ liệu mẫu cho role, tài khoản, danh mục, món ăn, option, tồn kho, voucher, đơn/review mẫu.

## Cài Đặt Backend

```bash
cd backend
npm install
copy .env.example .env

cd mobile
npm install

```

Sửa `backend/.env` nếu thông tin MySQL trên máy khác mặc định:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=fast_food_system
JWT_SECRET=change_this_secret
```

## Chạy Hệ Thống

Từ thư mục `backend`:

```bash
npm start
```

Hoặc chạy dev mode:

```bash
npm run dev
```

Sau khi server chạy, mở:

- Frontend: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

Health check trả về:

```json
{
  "success": true,
  "message": "API is running"
}
```

## Route Frontend Quan Trọng

| Route | Mục đích |
| --- | --- |
| `#/menu` | Xem thực đơn, tìm kiếm/lọc món, xem chi tiết món |
| `#/cart` | Giỏ hàng guest |
| `#/checkout` | Checkout khách vãng lai |
| `#/guest-order/result` | Kết quả đặt hàng guest |
| `#/orders/search` | Tra cứu đơn guest bằng mã đơn + SĐT |
| `#/register` | Đăng ký tài khoản |
| `#/login` | Đăng nhập khách hàng |
| `#/account` | Trang tài khoản khách hàng |
| `#/admin/login` | Đăng nhập quản trị |
| `#/admin` | Dashboard admin |
| `#/admin/orders` | Quản lý đơn hàng |
| `#/admin/users` | Quản lý tài khoản nhân viên |
| `#/kitchen` | KDS bếp |

## API Chính

### Menu

- `GET /api/menu/categories`
- `GET /api/menu/foods?keyword=&categoryId=&minPrice=&maxPrice=&availability=`
- `GET /api/menu/foods/:id`
- `GET /api/food-options/:foodId`

### Voucher

- `POST /api/vouchers/apply-public`

### Guest Order

- `POST /api/orders/guest`
- `GET /api/orders/tracking?orderCode=&phone=`
- `PATCH /api/orders/guest/:orderCode/cancel`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/register/resend-otp`
- `POST /api/auth/register/verify`
- `POST /api/auth/login`
- `POST /api/auth/login/request-otp`
- `POST /api/auth/login/verify-otp`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/admin/login`
- `POST /api/auth/admin/login/request-otp`
- `POST /api/auth/admin/login/verify-otp`
- `GET /api/auth/admin/me`

### Admin

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/confirm`
- `PATCH /api/admin/orders/:id/cancel`
- `GET /api/kitchen/orders`
- `PATCH /api/kitchen/orders/:id/cooking`
- `PATCH /api/kitchen/orders/:id/ready`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/lock`
- `PATCH /api/admin/users/:id/unlock`

## Tài Khoản Mẫu

Các tài khoản seed dùng chung mật khẩu:

```text
Admin@123
```

| Role | Email | SĐT |
| --- | --- | --- |
| ADMIN | `admin@fastfood.local` | `0900000001` |
| KITCHEN | `kitchen@fastfood.local` | `0900000003` |
| CSKH | `cskh@fastfood.local` | `0900000004` |
| MARKETING | `marketing@fastfood.local` | `0900000005` |
| CUSTOMER | `customer@fastfood.local` | `0900000002` |

## Voucher Mẫu

| Mã | Loại | Điều kiện |
| --- | --- | --- |
| `WELCOME10` | Giảm 10%, tối đa 30.000 VND | Đơn tối thiểu 80.000 VND |
| `FREESHIP25` | Giảm 25.000 VND | Đơn tối thiểu 120.000 VND |
| `MEMBER50K` | Voucher cá nhân/member | Chỉ gán mẫu cho `customer@fastfood.local` |

## Gợi Ý Demo Nhanh

1. Mở `#/menu`, tìm `burger`, lọc danh mục, mở chi tiết món.
2. Chọn size/topping, thêm món vào giỏ.
3. Mở `#/cart`, tăng/giảm số lượng, áp voucher `WELCOME10`.
4. Bấm tiếp tục đặt hàng, nhập thông tin guest và tạo đơn.
5. Ghi lại mã đơn ở trang kết quả.
6. Mở `#/orders/search`, nhập mã đơn + SĐT để tra cứu.
7. Đăng nhập `#/admin/login` bằng `admin@fastfood.local / Admin@123`.
8. Vào `#/admin/orders` để xác nhận/hủy đơn.
9. Đăng nhập bếp bằng `kitchen@fastfood.local / Admin@123`, mở `#/kitchen` và cập nhật trạng thái nấu.

## Kiểm Tra Cơ Bản

Không có test runner tự động trong `package.json`. Có thể kiểm tra nhanh bằng:

```bash
node --check backend/src/app.js
node -e "require('./backend/src/app'); console.log('app loaded')"
```

Với các file frontend ES module, kiểm tra cú pháp từng file:

```bash
node --check frontend/src/features/menu/MenuPage.js
node --check frontend/src/features/cart/CartPage.js
```

## Phạm Vi Chưa Hoàn Thiện

- Chưa tích hợp cổng thanh toán thật, callback/webhook thật.
- OTP đang là mock trong môi trường dev.
- Ví voucher cá nhân UC-11 mới có dữ liệu seed/chặn guest, chưa có UI/API đầy đủ.
- Trang tài khoản mới hiển thị hồ sơ và khung sổ địa chỉ; chưa CRUD sổ địa chỉ đầy đủ.
- Chưa có module vận chuyển, báo cáo tài chính, marketing campaign hoàn chỉnh.

## Tài Liệu Bổ Sung

- API notes: `docs/api/README.md`
- Database notes: `docs/database/README.md`
- Demo script: `docs/demo-script.md`
