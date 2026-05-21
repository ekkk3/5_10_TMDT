USE fast_food_system;

INSERT INTO roles (role_name, description) VALUES
  ('admin', 'Quan tri vien'),
  ('kitchen', 'Nhan vien bep'),
  ('customer', 'Khach hang')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

INSERT INTO users (role_id, full_name, email, phone, password_hash, status) VALUES
  ((SELECT role_id FROM roles WHERE role_name = 'admin'), 'Admin', 'admin', '0900000001', 'admin123', 'ACTIVE'),
  ((SELECT role_id FROM roles WHERE role_name = 'kitchen'), 'Kitchen', 'kitchen', '0900000002', 'kitchen123', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  password_hash = VALUES(password_hash),
  status = VALUES(status);

INSERT INTO categories (category_name, description, status) VALUES
  ('Burger', 'Burger va sandwich', 'ACTIVE'),
  ('Ga ran', 'Ga ran va mon an kem', 'ACTIVE'),
  ('Pizza', 'Pizza nong', 'ACTIVE'),
  ('Do uong', 'Nuoc giai khat', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  status = VALUES(status);

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Burger bo pho mai', 'Burger bo kem pho mai', 59000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', 'ACTIVE'
FROM categories
WHERE category_name = 'Burger'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Burger bo pho mai');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Ga ran gion cay', 'Ga ran vi cay', 69000, 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=80', 'ACTIVE'
FROM categories
WHERE category_name = 'Ga ran'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Ga ran gion cay');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Pizza xuc xich', 'Pizza xuc xich co lon', 129000, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80', 'ACTIVE'
FROM categories
WHERE category_name = 'Pizza'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Pizza xuc xich');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Khoai tay chien', 'Khoai tay chien gion', 39000, 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=900&q=80', 'ACTIVE'
FROM categories
WHERE category_name = 'Ga ran'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Khoai tay chien');

INSERT INTO foods (category_id, food_name, description, price, image_url, status)
SELECT category_id, 'Tra chanh mat ong', 'Tra chanh mat ong mat lanh', 25000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80', 'ACTIVE'
FROM categories
WHERE category_name = 'Do uong'
  AND NOT EXISTS (SELECT 1 FROM foods WHERE food_name = 'Tra chanh mat ong');
