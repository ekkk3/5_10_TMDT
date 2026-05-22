const db = require('../config/db'); // Dev C đã cấu hình db.js

// Lấy danh sách thực đơn cho khách
exports.getMenu = async (req, res) => {
    try {
        const [products] = await db.execute('SELECT * FROM Products WHERE status = "active"');
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu", error: error.message });
    }
};

// Xử lý tạo đơn hàng mới
exports.createOrder = async (req, res) => {
    const { customer_name, phone, address, cartItems, total_price } = req.body;
    
    try {
        // Lưu vào bảng Orders
        const [orderResult] = await db.execute(
            'INSERT INTO Orders (customer_name, phone, address, total_price, status) VALUES (?, ?, ?, ?, ?)',
            [customer_name, phone, address, total_price, 'pending']
        );
        
        const orderId = orderResult.insertId;

        // Lưu từng món vào bảng Order_Items
        for (let item of cartItems) {
            await db.execute(
                'INSERT INTO Order_Items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price]
            );
        }

        res.status(201).json({ message: "Đặt hàng thành công", orderId: orderId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi tạo đơn hàng", error: error.message });
    }
};