// Gọi API lấy menu hiển thị ra trang chủ
async function fetchMenu() {
    try {
        const response = await fetch('http://localhost:3000/api/user/products');
        const products = await response.json();
        
        const productList = document.getElementById('product-list');
        productList.innerHTML = ''; // Xóa nội dung cũ
        
        products.forEach(product => {
            productList.innerHTML += `
                <div class="product-item">
                    <img src="${product.image}" alt="${product.name}" width="100">
                    <h3>${product.name}</h3>
                    <p>Giá: ${product.price}đ</p>
                    <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})">Thêm vào giỏ</button>
                </div>
            `;
        });
    } catch (error) {
        console.error("Lỗi khi tải menu:", error);
    }
}

// Chạy hàm khi trang web tải xong
document.addEventListener("DOMContentLoaded", fetchMenu);

// Quản lý giỏ hàng vãng lai bằng LocalStorage
let cart = JSON.parse(localStorage.getItem('userCart')) || [];

function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    saveCart();
    alert(`Đã thêm ${name} vào giỏ hàng!`);
}

function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id); // Xóa món nếu số lượng = 0
        }
        saveCart();
    }
}

function saveCart() {
    localStorage.setItem('userCart', JSON.stringify(cart));
    // Nếu có hàm renderCart() thì gọi ở đây để cập nhật UI
}

// Xử lý submit form checkout
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (cart.length === 0) {
            alert('Giỏ hàng trống!');
            return;
        }

        const total_price = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const orderData = {
            customer_name: document.getElementById('customer_name').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            cartItems: cart,
            total_price: total_price
        };

        try {
            const response = await fetch('http://localhost:3000/api/user/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            
            const result = await response.json();
            if (response.ok) {
                alert('Đặt hàng thành công! Mã đơn: ' + result.orderId);
                localStorage.removeItem('userCart'); // Xóa giỏ hàng
                window.location.href = 'index.html'; // Trở về trang chủ
            } else {
                alert('Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
        }
    });
}