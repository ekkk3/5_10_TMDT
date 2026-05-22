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