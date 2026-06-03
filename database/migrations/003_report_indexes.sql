USE fast_food_system;

ALTER TABLE orders
  ADD INDEX idx_orders_report_status_created (order_status, created_at),
  ADD INDEX idx_orders_report_created_customer (created_at, customer_type),
  ADD INDEX idx_orders_report_created_payment (created_at, payment_method);
