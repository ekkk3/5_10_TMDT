export const HomePage = () => `
  <div class="hero-banner">
    <div class="hero-content">
      <div class="hero-eyebrow">🔥 Đặt hàng nhanh — Giao tận nơi</div>
      <h1>Thưởng thức <span class="text-accent">FastFood</span> ngay hôm nay</h1>
      <p>Burger thượng hạng, gà rán giòn rụm, đồ uống mát lạnh — tất cả chỉ với vài thao tác. Trải nghiệm đặt món nhanh chóng và tiện lợi nhất.</p>
      <div class="hero-actions">
        <a class="button button-primary" href="#/menu" style="padding:14px 28px;font-size:16px;">🍔 Xem thực đơn</a>
        <a class="button button-secondary" href="#/register" style="padding:14px 28px;font-size:16px;">Tạo tài khoản</a>
      </div>
    </div>
    <div class="hero-image">
      <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80" alt="Burger thượng hạng" />
    </div>
  </div>

  <section class="page session-home">
    <div class="section-header">
      <h2>Món ăn nổi bật</h2>
      <p>Những món best-seller được yêu thích nhất tại FastFood</p>
    </div>

    <div class="features-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr));">
      <a class="feature-card" href="#/menu" style="text-decoration:none;cursor:pointer;">
        <div class="feature-card__icon">🍔</div>
        <h3>Classic Burger</h3>
        <p>Thịt bò Úc nướng than, phô mai Cheddar, rau tươi và sốt đặc biệt.</p>
        <strong style="color:var(--accent);font-size:18px;">89.000₫</strong>
      </a>
      <a class="feature-card" href="#/menu" style="text-decoration:none;cursor:pointer;">
        <div class="feature-card__icon">🍗</div>
        <h3>Gà rán giòn</h3>
        <p>Gà tẩm bột giòn rụm, ướp gia vị bí truyền, ăn kèm sốt mật ong.</p>
        <strong style="color:var(--accent);font-size:18px;">79.000₫</strong>
      </a>
      <a class="feature-card" href="#/menu" style="text-decoration:none;cursor:pointer;">
        <div class="feature-card__icon">🍕</div>
        <h3>Pizza Pepperoni</h3>
        <p>Đế mỏng giòn, phô mai Mozzarella kéo sợi, pepperoni thơm lừng.</p>
        <strong style="color:var(--accent);font-size:18px;">129.000₫</strong>
      </a>
      <a class="feature-card" href="#/menu" style="text-decoration:none;cursor:pointer;">
        <div class="feature-card__icon">🥤</div>
        <h3>Trà đào cam sả</h3>
        <p>Trà oolong pha đào tươi, cam vắt và sả thơm — giải khát tuyệt vời.</p>
        <strong style="color:var(--accent);font-size:18px;">39.000₫</strong>
      </a>
    </div>

    <div class="section-header" style="margin-top:40px;">
      <h2>Khách hàng nói gì?</h2>
      <p>Hàng nghìn khách hàng hài lòng với trải nghiệm đặt món tại FastFood</p>
    </div>

    <div class="features-grid">
      <div class="feature-card" style="text-align:center;">
        <div style="font-size:36px;margin-bottom:4px;">⭐⭐⭐⭐⭐</div>
        <p style="font-style:italic;">"Đặt hàng siêu nhanh, giao đúng giờ, đồ ăn ngon đúng chuẩn. Sẽ đặt lại nhiều lần!"</p>
        <strong>— Minh Anh, Q.1</strong>
      </div>
      <div class="feature-card" style="text-align:center;">
        <div style="font-size:36px;margin-bottom:4px;">⭐⭐⭐⭐⭐</div>
        <p style="font-style:italic;">"Giao diện dễ dùng, thanh toán nhanh gọn. Burger ở đây là ngon nhất mình từng ăn!"</p>
        <strong>— Thùy Linh, Q.7</strong>
      </div>
      <div class="feature-card" style="text-align:center;">
        <div style="font-size:36px;margin-bottom:4px;">⭐⭐⭐⭐⭐</div>
        <p style="font-style:italic;">"Voucher giảm giá hấp dẫn, tích điểm đổi quà cực kỳ tiện. 10 điểm!"</p>
        <strong>— Hoàng Nam, Thủ Đức</strong>
      </div>
    </div>

    <div class="section-header" style="margin-top:40px;">
      <h2>Tại sao chọn FastFood?</h2>
      <p>Nền tảng đặt món hiện đại, tối ưu trải nghiệm người dùng</p>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-card__icon">⚡</div>
        <h3>Đặt món siêu nhanh</h3>
        <p>Giao diện trực quan, thao tác tối giản — từ chọn món đến thanh toán chỉ trong vài bước.</p>
      </div>
      <div class="feature-card">
        <div class="feature-card__icon">🎁</div>
        <h3>Voucher & tích điểm</h3>
        <p>Áp mã giảm giá, tích lũy điểm thưởng và đổi ưu đãi hấp dẫn dành riêng cho thành viên.</p>
      </div>
      <div class="feature-card">
        <div class="feature-card__icon">📱</div>
        <h3>Tương thích mọi thiết bị</h3>
        <p>Đặt hàng mượt mà trên điện thoại, máy tính bảng hay laptop — mọi lúc mọi nơi.</p>
      </div>
    </div>
  </section>
`;
