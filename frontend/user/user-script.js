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