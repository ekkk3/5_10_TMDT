USE fast_food_system;

INSERT INTO roles (role_name, description) VALUES
  ('CUSTOMER', 'Khach hang'),
  ('ADMIN', 'Quan tri vien'),
  ('KITCHEN', 'Nhan vien bep')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO users (role_id, full_name, email, phone, password_hash, status) VALUES
  ((SELECT role_id FROM roles WHERE role_name = 'ADMIN'), 'System Admin', 'admin@fastfood.local', '0900000001', '$2a$10$exampleAdminPasswordHash', 'ACTIVE'),
  ((SELECT role_id FROM roles WHERE role_name = 'CUSTOMER'), 'Nguyen Van Khach', 'customer@fastfood.local', '0900000002', '$2a$10$exampleCustomerPasswordHash', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  status = VALUES(status);

INSERT INTO categories (category_name, description, status) VALUES
  ('Burger', 'Burger va sandwich', 'ACTIVE'),
  ('Ga ran', 'Ga ran va mon an kem', 'ACTIVE'),
  ('Do uong', 'Nuoc giai khat', 'ACTIVE'),
  ('Mon an kem', 'Khoai tay chien va topping phu', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Classic Beef Burger', 'Burger bo, phomai va rau tuoi', 59000, '/assets/images/classic-beef-burger.jpg', 'ACTIVE'
FROM categories
WHERE category_name = 'Burger'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Classic Beef Burger');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Crispy Chicken Burger', 'Burger ga gion sot cay nhe', 55000, '/assets/images/crispy-chicken-burger.jpg', 'ACTIVE'
FROM categories
WHERE category_name = 'Burger'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Crispy Chicken Burger');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Ga Ran 2 Mieng', 'Hai mieng ga ran gion', 79000, '/assets/images/fried-chicken.jpg', 'ACTIVE'
FROM categories
WHERE category_name = 'Ga ran'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Ga Ran 2 Mieng');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Khoai Tay Chien', 'Khoai tay chien gion', 29000, '/assets/images/fries.jpg', 'ACTIVE'
FROM categories
WHERE category_name = 'Mon an kem'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Khoai Tay Chien');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Tra Dao Cam Sa', 'Tra trai cay mat lanh', 35000, '/assets/images/peach-tea.jpg', 'ACTIVE'
FROM categories
WHERE category_name = 'Do uong'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Tra Dao Cam Sa');

INSERT INTO food_options (food_id, option_name, option_type, extra_price, is_required, max_quantity, status)
SELECT food_id, 'Size M', 'SIZE', 0, TRUE, 1, 'ACTIVE'
FROM foods
WHERE food_name IN ('Classic Beef Burger', 'Crispy Chicken Burger', 'Ga Ran 2 Mieng', 'Khoai Tay Chien', 'Tra Dao Cam Sa')
  AND NOT EXISTS (
    SELECT 1 FROM food_options
    WHERE food_options.food_id = foods.food_id AND option_name = 'Size M'
  );

INSERT INTO food_options (food_id, option_name, option_type, extra_price, is_required, max_quantity, status)
SELECT food_id, 'Size L', 'SIZE', 12000, FALSE, 1, 'ACTIVE'
FROM foods
WHERE food_name IN ('Classic Beef Burger', 'Crispy Chicken Burger', 'Khoai Tay Chien', 'Tra Dao Cam Sa')
  AND NOT EXISTS (
    SELECT 1 FROM food_options
    WHERE food_options.food_id = foods.food_id AND option_name = 'Size L'
  );

INSERT INTO food_options (food_id, option_name, option_type, extra_price, is_required, max_quantity, status)
SELECT food_id, 'Them phomai', 'TOPPING', 10000, FALSE, 3, 'ACTIVE'
FROM foods
WHERE food_name IN ('Classic Beef Burger', 'Crispy Chicken Burger')
  AND NOT EXISTS (
    SELECT 1 FROM food_options
    WHERE food_options.food_id = foods.food_id AND option_name = 'Them phomai'
  );

INSERT INTO food_options (food_id, option_name, option_type, extra_price, is_required, max_quantity, status)
SELECT food_id, 'Sot dac biet', 'TOPPING', 7000, FALSE, 3, 'ACTIVE'
FROM foods
WHERE food_name IN ('Classic Beef Burger', 'Crispy Chicken Burger', 'Ga Ran 2 Mieng', 'Khoai Tay Chien')
  AND NOT EXISTS (
    SELECT 1 FROM food_options
    WHERE food_options.food_id = foods.food_id AND option_name = 'Sot dac biet'
  );

INSERT INTO vouchers (
  voucher_code,
  voucher_name,
  discount_type,
  discount_value,
  min_order_amount,
  max_discount_amount,
  usage_limit,
  target_type,
  start_date,
  end_date,
  status
) VALUES
  ('WELCOME10', 'Giam 10% cho don dau', 'PERCENT', 10, 80000, 30000, 1000, 'PUBLIC', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE'),
  ('FREESHIP25', 'Ho tro phi giao hang', 'AMOUNT', 25000, 120000, NULL, 500, 'PUBLIC', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE'),
  ('MEMBER50K', 'Uu dai rieng cho thanh vien', 'AMOUNT', 50000, 200000, NULL, 1, 'PERSONAL', '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  voucher_name = VALUES(voucher_name),
  discount_type = VALUES(discount_type),
  discount_value = VALUES(discount_value),
  min_order_amount = VALUES(min_order_amount),
  max_discount_amount = VALUES(max_discount_amount),
  usage_limit = VALUES(usage_limit),
  target_type = VALUES(target_type),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  status = VALUES(status);

INSERT INTO user_vouchers (user_id, voucher_id, status)
SELECT users.user_id, vouchers.voucher_id, 'AVAILABLE'
FROM users
JOIN vouchers ON vouchers.voucher_code = 'MEMBER50K'
WHERE users.email = 'customer@fastfood.local'
  AND NOT EXISTS (
    SELECT 1 FROM user_vouchers
    WHERE user_vouchers.user_id = users.user_id
      AND user_vouchers.voucher_id = vouchers.voucher_id
  );
