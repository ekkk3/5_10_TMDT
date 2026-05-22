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