-- Tạo cơ sở dữ liệu
DROP DATABASE IF EXISTS fast_food_system;
CREATE DATABASE fast_food_system;
USE fast_food_system;

-- 1. Bảng roles [cite: 2, 3, 4]
CREATE TABLE roles (
    role_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng users [cite: 5, 6, 7]
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NULL,
    phone VARCHAR(20) UNIQUE NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE','LOCKED','INACTIVE') DEFAULT 'ACTIVE',
    total_points INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- 3. Bảng addresses [cite: 8, 9, 10]
CREATE TABLE addresses (
    address_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    address_detail VARCHAR(255) NOT NULL,
    ward VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    city VARCHAR(100) NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 4. Bảng delivery_areas [cite: 11, 12, 13]
CREATE TABLE delivery_areas (
    area_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    area_name VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    delivery_fee DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Bảng categories [cite: 14, 15, 16]
CREATE TABLE categories (
    category_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    status ENUM('ACTIVE','HIDDEN') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng foods [cite: 17, 18, 19]
CREATE TABLE foods (
    food_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    food_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    image_url VARCHAR(255) NULL,
    status ENUM('ACTIVE','HIDDEN','OUT_OF_STOCK') DEFAULT 'ACTIVE',
    average_rating DECIMAL(3,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- 7. Bảng food_options [cite: 20, 21, 22]
CREATE TABLE food_options (
    option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    food_id BIGINT NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_type ENUM('SIZE','TOPPING','OTHER') NOT NULL,
    extra_price DECIMAL(12,2) DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    max_quantity INT DEFAULT 1,
    status ENUM('ACTIVE','OUT_OF_STOCK','HIDDEN') DEFAULT 'ACTIVE',
    FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- 8. Bảng inventory [cite: 23, 24, 25]
CREATE TABLE inventory (
    inventory_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    food_id BIGINT NOT NULL,
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    is_unlimited BOOLEAN DEFAULT FALSE,
    updated_by BIGINT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (food_id) REFERENCES foods(food_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- 9. Bảng carts [cite: 26, 27, 28]
CREATE TABLE carts (
    cart_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    session_id VARCHAR(100) NULL,
    status ENUM('ACTIVE','ORDERED','EXPIRED') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 10. Bảng cart_items [cite: 29, 30, 31]
CREATE TABLE cart_items (
    cart_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cart_id BIGINT NOT NULL,
    food_id BIGINT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(cart_id),
    FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- 11. Bảng cart_item_options [cite: 32, 33, 34]
CREATE TABLE cart_item_options (
    cart_item_option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cart_item_id BIGINT NOT NULL,
    option_id BIGINT NOT NULL,
    quantity INT DEFAULT 1,
    extra_price DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (cart_item_id) REFERENCES cart_items(cart_item_id),
    FOREIGN KEY (option_id) REFERENCES food_options(option_id)
);

-- 12. Bảng orders [cite: 35, 36, 37, 98, 99]
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_code VARCHAR(30) NOT NULL UNIQUE,
    user_id BIGINT NULL,
    customer_type ENUM('MEMBER','GUEST') DEFAULT 'MEMBER',
    guest_name VARCHAR(100) NULL,
    guest_phone VARCHAR(20) NULL,
    guest_email VARCHAR(100) NULL,
    delivery_address VARCHAR(255) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    delivery_fee DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    order_status ENUM('PENDING','CONFIRMED','COOKING','READY','DELIVERING','COMPLETED','CANCELLED') DEFAULT 'PENDING',
    payment_status ENUM('UNPAID','COD','PAID','FAILED','VERIFYING','REFUNDED') DEFAULT 'UNPAID',
    payment_method ENUM('COD','ONLINE_MOCK') DEFAULT 'COD',
    note VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 13. Bảng order_items [cite: 38, 39, 40]
CREATE TABLE order_items (
    order_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    food_id BIGINT NOT NULL,
    food_name_snapshot VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    note VARCHAR(255) NULL,
    kitchen_status ENUM('WAITING','COOKING','DONE','CANCELLED') DEFAULT 'WAITING',
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- 14. Bảng order_item_options [cite: 41, 42, 43]
CREATE TABLE order_item_options (
    order_item_option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_item_id BIGINT NOT NULL,
    option_name_snapshot VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    extra_price DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
);

-- 15. Bảng order_status_logs [cite: 44, 45, 46, 101, 102]
CREATE TABLE order_status_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- 16. Bảng payments [cite: 47, 48, 49]
CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    payment_method ENUM('COD','ONLINE','E_WALLET','BANK') NOT NULL,
    provider VARCHAR(100) NULL,
    transaction_code VARCHAR(100) UNIQUE NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_status ENUM('PENDING','SUCCESS','FAILED','CANCELLED','VERIFYING','REFUNDED') DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- 17. Bảng vouchers [cite: 50, 51, 52, 100]
CREATE TABLE vouchers (
    voucher_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    voucher_code VARCHAR(50) NOT NULL UNIQUE,
    voucher_name VARCHAR(150) NOT NULL,
    discount_type ENUM('PERCENT','AMOUNT') NOT NULL,
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount_amount DECIMAL(12,2) NULL,
    usage_limit INT NULL,
    used_count INT DEFAULT 0,
    target_type ENUM('PUBLIC','MEMBER','PERSONAL') DEFAULT 'PUBLIC',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('DRAFT','ACTIVE','EXPIRED','DISABLED') DEFAULT 'DRAFT'
);

-- 18. Bảng user_vouchers [cite: 53, 54, 55, 100]
CREATE TABLE user_vouchers (
    user_voucher_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    voucher_id BIGINT NOT NULL,
    status ENUM('AVAILABLE','USED','EXPIRED','LOCKED') DEFAULT 'AVAILABLE',
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id)
);

-- 19. Bảng order_vouchers [cite: 56, 57, 58, 100]
CREATE TABLE order_vouchers (
    order_voucher_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    voucher_id BIGINT NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id)
);

-- 20. Bảng loyalty_programs [cite: 59, 60, 61, 100]
CREATE TABLE loyalty_programs (
    program_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(150) NOT NULL,
    point_rate DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    reward_type ENUM('VOUCHER','GIFT','DISCOUNT') NOT NULL,
    required_points INT NOT NULL,
    reward_description VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('DRAFT','ACTIVE','PAUSED','EXPIRED') DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 21. Bảng point_transactions [cite: 62, 63, 64, 100]
CREATE TABLE point_transactions (
    point_transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    order_id BIGINT NULL,
    program_id BIGINT NULL,
    transaction_type ENUM('EARN','REDEEM','REFUND','ADJUST') NOT NULL,
    points INT NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (program_id) REFERENCES loyalty_programs(program_id)
);

-- 22. Bảng reviews [cite: 65, 66, 67]
CREATE TABLE reviews (
    review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    food_id BIGINT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NULL,
    image_url VARCHAR(255) NULL,
    status ENUM('PENDING','APPROVED','HIDDEN','REJECTED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (food_id) REFERENCES foods(food_id)
);

-- 23. Bảng support_tickets [cite: 68, 69, 70, 101, 102]
CREATE TABLE support_tickets (
    ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_code VARCHAR(30) NOT NULL UNIQUE,
    user_id BIGINT NULL,
    order_id BIGINT NULL,
    guest_name VARCHAR(100) NULL,
    guest_phone VARCHAR(20) NULL,
    ticket_type ENUM('ORDER_SUPPORT','COMPLAINT','RETURN_REFUND','FEEDBACK','ACCOUNT_ERROR','OTHER') NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    evidence_url VARCHAR(255) NULL,
    assigned_to BIGINT NULL,
    status ENUM('NEW','RECEIVED','PROCESSING','WAITING_CUSTOMER','WAITING_APPROVAL','RESPONDED','COMPLETED','REJECTED','CLOSED') DEFAULT 'NEW',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (assigned_to) REFERENCES users(user_id)
);

-- 24. Bảng ticket_messages [cite: 71, 72, 73, 101, 102]
CREATE TABLE ticket_messages (
    message_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ticket_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    sender_type ENUM('CUSTOMER','CSKH','MANAGER','SYSTEM') NOT NULL,
    message_content TEXT NOT NULL,
    attachment_url VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
);

-- 25. Bảng marketing_campaigns [cite: 74, 75, 76]
CREATE TABLE marketing_campaigns (
    campaign_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_name VARCHAR(150) NOT NULL,
    campaign_type ENUM('VOUCHER','BANNER','EMAIL','LOYALTY') NOT NULL,
    voucher_id BIGINT NULL,
    banner_url VARCHAR(255) NULL,
    target_type ENUM('ALL','MEMBER','GUEST') DEFAULT 'ALL',
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status ENUM('DRAFT','ACTIVE','SCHEDULED','EXPIRED','DISABLED') DEFAULT 'DRAFT',
    created_by BIGINT NOT NULL,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 26. Bảng notifications [cite: 77, 78, 79]
CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    order_id BIGINT NULL,
    channel ENUM('SMS','EMAIL','PUSH') NOT NULL,
    receiver VARCHAR(100) NOT NULL,
    title VARCHAR(150) NULL,
    content TEXT NOT NULL,
    send_status ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- 27. Bảng delivery_orders [cite: 80, 81, 82, 101, 102]
CREATE TABLE delivery_orders (
    delivery_order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    provider_order_code VARCHAR(100) UNIQUE NULL,
    shipping_fee DECIMAL(12,2) DEFAULT 0,
    driver_name VARCHAR(100) NULL,
    driver_phone VARCHAR(20) NULL,
    vehicle_number VARCHAR(30) NULL,
    delivery_status ENUM('WAITING','FINDING_DRIVER','DELIVERING','DELIVERED','FAILED','CANCELLED') DEFAULT 'WAITING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- 28. Bảng reconciliations [cite: 83, 84, 85, 101, 102]
CREATE TABLE reconciliations (
    reconciliation_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    source_type ENUM('COD','ONLINE','BANK','E_WALLET','3PL') NOT NULL,
    system_amount DECIMAL(12,2) NOT NULL,
    actual_amount DECIMAL(12,2) NOT NULL,
    difference_amount DECIMAL(12,2) DEFAULT 0,
    status ENUM('PENDING','MATCHED','DIFFERENCE','CONFIRMED') DEFAULT 'PENDING',
    created_by BIGINT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 29. Bảng reconciliation_items [cite: 86, 87, 88]
CREATE TABLE reconciliation_items (
    reconciliation_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reconciliation_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    payment_id BIGINT NULL,
    system_amount DECIMAL(12,2) NOT NULL,
    actual_amount DECIMAL(12,2) NOT NULL,
    status ENUM('MATCHED','DIFFERENCE','PENDING') DEFAULT 'PENDING',
    note VARCHAR(255) NULL,
    FOREIGN KEY (reconciliation_id) REFERENCES reconciliations(reconciliation_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);

-- 30. Bảng system_logs [cite: 89, 90, 91, 101, 102]
CREATE TABLE system_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    object_type VARCHAR(100) NULL,
    object_id BIGINT NULL,
    description TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
