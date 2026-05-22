USE fast_food_system;

ALTER TABLE orders
  ADD COLUMN customer_type ENUM('MEMBER','GUEST') DEFAULT 'MEMBER' AFTER user_id,
  ADD COLUMN payment_method ENUM('COD','ONLINE_MOCK') DEFAULT 'COD' AFTER payment_status;

INSERT INTO delivery_areas (area_name, district, city, delivery_fee, is_active)
SELECT 'Trung tam Quan 1', 'Quan 1', 'TP HCM', 15000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM delivery_areas WHERE district = 'Quan 1' AND city = 'TP HCM');

INSERT INTO delivery_areas (area_name, district, city, delivery_fee, is_active)
SELECT 'Quan 3', 'Quan 3', 'TP HCM', 18000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM delivery_areas WHERE district = 'Quan 3' AND city = 'TP HCM');

INSERT INTO delivery_areas (area_name, district, city, delivery_fee, is_active)
SELECT 'Binh Thanh', 'Binh Thanh', 'TP HCM', 22000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM delivery_areas WHERE district = 'Binh Thanh' AND city = 'TP HCM');
