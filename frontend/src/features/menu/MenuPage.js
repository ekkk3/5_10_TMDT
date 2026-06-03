import { menuService } from '../../services/menuService.js';
import { foodOptionsService } from '../food-options/foodOptionsService.js';
import { CartContext } from '../../contexts/CartContext.js';
import {
  FoodOptionSelector,
  buildCustomizedFoodPayload,
  calculateOptionTotal,
  enforceMaxSelect,
  validateSelectedOptions
} from '../food-options/components/FoodOptionSelector.js';


const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});


const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');


const formatMoney = (value) => moneyFormatter.format(Number(value || 0));


const formatRating = (rating) => {
  const ratingValue = Number(rating || 0);
  return ratingValue > 0 ? `${ratingValue.toFixed(1)}/5` : 'Chưa có đánh giá';
};


const formatRatingSummary = (food) => {
  const rating = formatRating(food.average_rating);
  const reviewCount = Number(food.review_count || 0);
  return reviewCount > 0 ? `${rating} (${reviewCount})` : rating;
};


const isFoodAvailable = (food) => Boolean(food.is_available) && food.status === 'ACTIVE';


const renderAvailabilityBadge = (food) => {
  const available = isFoodAvailable(food);
  return `<span class="food-status ${available ? 'is-available' : 'is-out'}">${available ? 'Còn hàng' : 'Hết hàng'}</span>`;
};


const getFoodImage = (foodName) => {
  const seed = encodeURIComponent(foodName || 'fast food');
  return `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80&ixid=${seed}`;
};


const renderCategories = (categories, activeCategoryId) => `
  <button class="menu-chip ${!activeCategoryId ? 'is-active' : ''}" data-category-id="">Tất cả</button>
  ${categories
    .map(
      (category) => `
        <button class="menu-chip ${String(activeCategoryId) === String(category.category_id) ? 'is-active' : ''}" data-category-id="${category.category_id}">
          ${escapeHtml(category.category_name)}
        </button>
      `
    )
    .join('')}
`;


const renderFoodCard = (food) => {
  const available = isFoodAvailable(food);
  const imageUrl = food.image_url || getFoodImage(food.food_name);
  const fallbackImage = getFoodImage(food.food_name);


  return `
    <article class="food-card" data-food-id="${food.food_id}">
      <button class="food-card__media" type="button" data-view-detail="${food.food_id}" aria-label="Xem chi tiet ${escapeHtml(food.food_name)}">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(food.food_name)}" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}';" />
      </button>
      <div class="food-card__body">
        <div class="food-card__top">
          <h3>${escapeHtml(food.food_name)}</h3>
          <strong>${formatMoney(food.price)}</strong>
        </div>
        <p>${escapeHtml(food.description || 'Món ngon đang được cập nhật mô tả.')}</p>
        <div class="food-card__meta">
          <span>${escapeHtml(food.category?.category_name || 'Khác')}</span>
          <span>${formatRatingSummary(food)}</span>
        </div>
        ${renderAvailabilityBadge(food)}
        <div class="food-card__actions">
          <button class="button button-secondary" type="button" data-view-detail="${food.food_id}">Chi tiết</button>
          <button class="button button-primary" type="button" data-view-detail="${food.food_id}" ${available ? '' : 'disabled'}>
            ${available ? 'Thêm vào giỏ' : 'Hết hàng'}
          </button>
        </div>
      </div>
    </article>
  `;
};


const renderReviews = (reviews = []) => {
  if (!reviews.length) {
    return '<p class="review-empty">Chưa có đánh giá</p>';
  }


  return reviews
    .map(
      (review) => `
        <article class="review-item">
          <div>
            <strong>${escapeHtml(review.reviewer_name || 'Khách hàng')}</strong>
            <span>${Number(review.rating).toFixed(1)}/5</span>
          </div>
          <p>${escapeHtml(review.comment || 'Khách hàng không để lại bình luận.')}</p>
        </article>
      `
    )
    .join('');
};


const renderModal = (food, optionGroups = []) => {
  const available = isFoodAvailable(food);
  const imageUrl = food.image_url || getFoodImage(food.food_name);
  const fallbackImage = getFoodImage(food.food_name);


  return `
    <div class="menu-modal__backdrop" data-close-modal></div>
    <section class="menu-modal" role="dialog" aria-modal="true" aria-labelledby="food-detail-title">
      <button class="menu-modal__close" type="button" data-close-modal aria-label="Đóng chi tiết">x</button>
      <div class="menu-modal__image">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(food.food_name)}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}';" />
      </div>
      <div class="menu-modal__content">
        <span class="menu-modal__category">${escapeHtml(food.category?.category_name || 'Khác')}</span>
        <h2 id="food-detail-title">${escapeHtml(food.food_name)}</h2>
        <strong data-food-total-price>${formatMoney(food.price)}</strong>
        <p>${escapeHtml(food.description || 'Món ngon đang được cập nhật mô tả.')}</p>
        <div class="menu-modal__rating">
          <span>${formatRatingSummary(food)}</span>
          ${renderAvailabilityBadge(food)}
        </div>
        ${FoodOptionSelector(optionGroups)}
        <div class="menu-modal__cart-controls">
          <label>
            <span>Số lượng</span>
            <input type="number" min="1" step="1" value="1" data-add-quantity />
          </label>
          <label>
            <span>Ghi chú</span>
            <textarea rows="2" maxlength="180" placeholder="Ví dụ: ít cay, không hành..." data-add-note></textarea>
          </label>
        </div>
        <button class="button button-primary menu-modal__add" type="button" data-add-customized-food ${available ? '' : 'disabled'}>
          ${available ? 'Thêm vào giỏ' : 'Hết hàng'}
        </button>
        <details class="menu-modal__reviews">
          <summary>Xem đánh giá</summary>
          <div class="menu-modal__reviews-content">
            <h3>Đánh giá</h3>
            ${renderReviews(food.reviews)}
          </div>
        </details>
      </div>
    </section>
  `;
};


const pageStyles = `
  <style>
    .menu-page { padding: 2px 0 24px; animation: slideUp 400ms var(--ease); }
    .menu-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
    .menu-header h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 42px); line-height: 1.06; color: var(--text); }
    .menu-header p { margin: 0; max-width: 1040px; color: var(--text-muted); font-size: 15px; line-height: 1.6; }
    .menu-shell { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; align-items: start; }
    .menu-sidebar { position: sticky; top: 84px; display: grid; gap: 16px; padding: 20px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--bg-glass); backdrop-filter: blur(10px); }
    .menu-sidebar h2 { margin: 0; font-size: 20px; color: var(--text); }
    .menu-sidebar__section { display: grid; gap: 10px; }
    .menu-sidebar__section h3 { margin: 0; color: var(--text-subtle); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
    .menu-results { display: grid; gap: 16px; }
    .menu-controls { display: grid; gap: 10px; }
    .menu-input { width: 100%; min-height: 46px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); }
    .menu-input:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .menu-categories { display: grid; gap: 6px; }
    .menu-chip { min-height: 40px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; background: var(--bg-elevated); color: var(--text-muted); font-weight: 700; font-size: 14px; cursor: pointer; transition: all var(--transition); }
    .menu-chip.is-active, .menu-chip:hover { border-color: var(--accent); background: var(--accent); color: #fff; transform: translateY(-1px); }
    .menu-status { padding: 28px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-glass); color: var(--text-muted); }
    .food-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    .food-card { height: 100%; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-glass); transition: all 250ms var(--ease); }
    .food-card:hover { transform: translateY(-4px); border-color: var(--border-hover); box-shadow: var(--shadow-card), 0 0 30px rgba(225,29,72,0.06); }
    .food-card__media { position: relative; width: 100%; height: 192px; display: block; padding: 0; border: 0; cursor: pointer; background: var(--bg-elevated); overflow: hidden; }
    .food-card__media::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to top, rgba(0,0,0,0.5), transparent); pointer-events: none; }
    .food-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 300ms var(--ease); }
    .food-card:hover .food-card__media img { transform: scale(1.05); }
    .food-card__body { flex: 1; display: flex; flex-direction: column; padding: 16px; }
    .food-card__top { min-height: 42px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .food-card h3 { min-width: 0; margin: 0; font-size: 16px; line-height: 1.3; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .food-card__top strong { flex: 0 0 auto; color: var(--accent-light); white-space: nowrap; font-size: 15px; }
    .food-card p { min-height: 40px; margin: 10px 0 12px; color: var(--text-muted); line-height: 1.48; font-size: 13px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .food-card__meta { min-height: 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; color: var(--text-subtle); font-size: 13px; }
    .food-status { display: inline-flex; align-items: center; width: max-content; min-height: 26px; margin-bottom: 12px; padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px; font-weight: 800; }
    .food-status.is-available { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-border); }
    .food-status.is-out { background: var(--error-bg); color: var(--error); border: 1px solid var(--error-border); }
    .food-card__actions { margin-top: auto; display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px; }
    .menu-store-footer { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 18px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-glass); }
    .menu-store-footer div { display: grid; gap: 4px; }
    .menu-store-footer span { color: var(--text-subtle); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .menu-store-footer strong { color: var(--text-secondary); font-size: 14px; }
    .button:disabled { cursor: not-allowed; opacity: 0.4; }
    .menu-modal-root:not(:empty) { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; padding: 18px; }
    .menu-modal__backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(12px); }
    .menu-modal { position: relative; width: min(940px, 100%); max-height: calc(100vh - 36px); overflow: auto; display: grid; grid-template-columns: minmax(300px, 0.86fr) minmax(0, 1.14fr); background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6); animation: scaleIn 250ms var(--ease); }
    .menu-modal__close { position: absolute; top: 12px; right: 12px; z-index: 5; width: 36px; height: 36px; border: 0; border-radius: var(--radius-full); background: rgba(0,0,0,0.6); color: #fff; font-weight: 900; cursor: pointer; }
    .menu-modal__close:hover { background: var(--accent); }
    .menu-modal__image { min-height: 430px; display: grid; place-items: center; padding: 18px; background: radial-gradient(circle at 50% 24%, rgba(251,146,60,0.18), transparent 42%), var(--bg-elevated); overflow: hidden; }
    .menu-modal__image img { width: 100%; height: auto; max-height: 520px; object-fit: contain; display: block; border-radius: calc(var(--radius-lg) - 6px); box-shadow: 0 18px 44px rgba(0,0,0,0.28); }
    .menu-modal__content { padding: 28px; }
    .menu-modal__category { color: var(--text-subtle); font-weight: 800; text-transform: uppercase; font-size: 12px; }
    .menu-modal h2 { margin: 8px 0; font-size: 28px; color: var(--text); }
    .menu-modal__content > strong { display: block; margin-bottom: 12px; color: var(--accent-light); font-size: 22px; }
    .menu-modal__content > p { color: var(--text-muted); line-height: 1.6; }
    .menu-modal__rating { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 12px 0; font-weight: 800; color: var(--text-secondary); }
    .menu-modal__rating .food-status { margin-bottom: 0; }
    .menu-modal__cart-controls { display: grid; gap: 10px; margin-top: 14px; }
    .menu-modal__cart-controls label { display: grid; gap: 6px; color: var(--text-muted); font-weight: 700; font-size: 14px; }
    .menu-modal__cart-controls input, .menu-modal__cart-controls textarea { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; color: var(--text); font: inherit; background: var(--bg-elevated); }
    .menu-modal__cart-controls input:focus, .menu-modal__cart-controls textarea:focus { border-color: var(--accent); outline: 0; box-shadow: var(--focus); }
    .menu-modal__cart-controls input { max-width: 120px; }
    .menu-modal__add { width: 100%; margin-top: 14px; }
    .food-options { display: grid; gap: 14px; margin-top: 18px; }
    .food-options__empty { margin-top: 16px; padding: 12px; border: 1px dashed var(--border-hover); border-radius: var(--radius-sm); color: var(--text-subtle); }
    .food-option-group { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); }
    .food-option-group.has-error { border-color: var(--error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    .food-option-group__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .food-option-group__header h3 { margin: 0; font-size: 15px; color: var(--text); }
    .food-option-group__header span { color: var(--text-subtle); font-size: 12px; font-weight: 700; }
    .food-option-group__choices { display: grid; gap: 8px; }
    .food-option-group__choices--size { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .food-option-choice { min-height: 52px; display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-glass); cursor: pointer; transition: all var(--transition); }
    .food-option-choice:has(input:checked) { border-color: var(--accent); background: var(--accent-subtle); }
    .food-option-choice input { width: 18px; height: 18px; flex: 0 0 auto; accent-color: var(--accent); }
    .food-option-choice span { min-width: 0; display: grid; gap: 3px; }
    .food-option-choice strong { font-size: 14px; line-height: 1.2; color: var(--text); }
    .food-option-choice small { color: var(--text-muted); font-weight: 700; }
    .food-option-choice.is-disabled, .food-option-choice.is-limit-disabled { opacity: 0.35; cursor: not-allowed; }
    .food-option-group__error { min-height: 18px; margin: 0; color: var(--error); font-size: 13px; font-weight: 700; }
    .menu-modal__reviews { margin-top: 22px; border-top: 1px solid var(--border); padding-top: 16px; }
    .menu-modal__reviews summary { min-height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-elevated); color: var(--text); font-weight: 800; cursor: pointer; transition: all var(--transition); list-style: none; }
    .menu-modal__reviews summary::-webkit-details-marker { display: none; }
    .menu-modal__reviews summary::after { content: '↓'; font-size: 13px; transition: transform var(--transition); }
    .menu-modal__reviews[open] summary { border-color: var(--accent); background: var(--accent-subtle); color: var(--accent-light); }
    .menu-modal__reviews[open] summary::after { transform: rotate(180deg); }
    .menu-modal__reviews-content { margin-top: 16px; }
    .menu-modal__reviews h3 { margin: 0 0 12px; color: var(--text); }
    .review-item { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .review-item div { display: flex; justify-content: space-between; gap: 12px; }
    .review-item p, .review-empty { margin: 8px 0 0; color: var(--text-muted); font-size: 14px; }
    @media (max-width: 920px) {
      .menu-shell { grid-template-columns: 1fr; }
      .menu-sidebar { position: static; }
      .menu-controls { grid-template-columns: 1fr 1fr; }
      .menu-categories { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .food-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .menu-header { display: block; }
      .menu-controls, .menu-categories, .food-grid, .menu-modal, .menu-store-footer { grid-template-columns: 1fr; }
      .food-option-group__choices--size { grid-template-columns: 1fr; }
      .menu-modal__image { min-height: 240px; padding: 12px; }
      .menu-modal__image img { max-height: 300px; }
      .food-card__actions { grid-template-columns: 1fr; }
    }
  </style>
`;


export const MenuPage = () => `
  ${pageStyles}
  <section class="menu-page" data-menu-page>
    <div class="menu-header">
      <div>
        <h1>Thực đơn</h1>
        <p>Tìm món theo tên, danh mục hoặc khoảng giá để khách hàng vãng lai xem nhanh trước khi thêm vào giỏ.</p>
      </div>
    </div>


    <div class="menu-shell">
      <aside class="menu-sidebar" aria-label="Bộ lọc thực đơn">
        <h2>Bộ lọc</h2>
        <form class="menu-controls" data-menu-form>
          <input class="menu-input" name="keyword" type="search" placeholder="Tìm burger, gà rán, đồ uống..." autocomplete="off" />
          <select class="menu-input" name="availability" aria-label="Trạng thái tồn kho">
            <option value="">Tất cả trạng thái</option>
            <option value="available">Còn hàng</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
          <input class="menu-input" name="minPrice" type="number" min="0" step="1000" placeholder="Giá từ" />
          <input class="menu-input" name="maxPrice" type="number" min="0" step="1000" placeholder="Giá đến" />
          <button class="button button-primary" type="submit">Tìm kiếm</button>
          <button class="button button-secondary" type="button" data-clear-menu-filters>Xóa lọc</button>
        </form>
        <div class="menu-sidebar__section">
          <h3>Danh mục</h3>
          <div class="menu-categories" data-menu-categories></div>
        </div>
      </aside>

      <div class="menu-results">
        <div data-menu-content class="menu-status">Đang tải thực đơn...</div>
        <footer class="menu-store-footer" aria-label="Thông tin cửa hàng">
          <div><span>Giờ phục vụ</span><strong>08:00 - 22:00 hằng ngày</strong></div>
          <div><span>Khu vực giao</span><strong>Quận 1, Quận 3, Bình Thạnh</strong></div>
          <div><span>Hỗ trợ</span><strong>0900 000 001</strong></div>
        </footer>
      </div>
    </div>
    <div class="menu-modal-root" data-menu-modal-root></div>
  </section>
`;


export const mountMenuPage = () => {
  const root = document.querySelector('[data-menu-page]');
  if (!root) return;


  const form = root.querySelector('[data-menu-form]');
  const categoriesRoot = root.querySelector('[data-menu-categories]');
  const contentRoot = root.querySelector('[data-menu-content]');
  const modalRoot = root.querySelector('[data-menu-modal-root]');
  const state = {
    categories: [],
    foods: [],
    filters: {
      keyword: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      availability: ''
    }
  };

  let activeModalFood = null;


  const setStatus = (message) => {
    contentRoot.className = 'menu-status';
    contentRoot.innerHTML = escapeHtml(message);
  };


  const renderFoods = () => {
    if (!state.foods.length) {
      setStatus('Không tìm thấy món. Hãy thử xóa bộ lọc hoặc đổi từ khóa.');
      return;
    }


    contentRoot.className = 'food-grid';
    contentRoot.innerHTML = state.foods.map(renderFoodCard).join('');
  };


  const loadFoods = async () => {
    setStatus('Đang tải thực đơn...');


    try {
      state.foods = await menuService.getFoods(state.filters);
      renderFoods();
    } catch (error) {
      setStatus(error.message || 'Lỗi tải dữ liệu thực đơn. Vui lòng thử lại.');
    }
  };


  const loadInitialData = async () => {
    try {
      const [categories, foods] = await Promise.all([
        menuService.getCategories(),
        menuService.getFoods(state.filters)
      ]);


      state.categories = categories;
      state.foods = foods;
      categoriesRoot.innerHTML = renderCategories(state.categories, state.filters.categoryId);
      renderFoods();
    } catch (error) {
      setStatus(error.message || 'Lỗi tải dữ liệu thực đơn. Vui lòng thử lại.');
    }
  };


  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.filters.keyword = formData.get('keyword') || '';
    state.filters.minPrice = formData.get('minPrice') || '';
    state.filters.maxPrice = formData.get('maxPrice') || '';
    state.filters.availability = formData.get('availability') || '';
    loadFoods();
  });


  root.querySelector('[data-clear-menu-filters]')?.addEventListener('click', () => {
    form.reset();
    state.filters = {
      keyword: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      availability: ''
    };
    categoriesRoot.innerHTML = renderCategories(state.categories, state.filters.categoryId);
    loadFoods();
  });


  categoriesRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category-id]');
    if (!button) return;


    state.filters.categoryId = button.dataset.categoryId;
    categoriesRoot.innerHTML = renderCategories(state.categories, state.filters.categoryId);
    loadFoods();
  });


  contentRoot.addEventListener('click', async (event) => {
    const detailButton = event.target.closest('[data-view-detail]');
    if (!detailButton) return;


    activeModalFood = null;
    modalRoot.innerHTML = '<div class="menu-modal__backdrop"></div><section class="menu-modal"><div class="menu-modal__content">Đang tải chi tiết món...</div></section>';


    try {
      const foodId = detailButton.dataset.viewDetail;
      const [food, optionGroups] = await Promise.all([
        menuService.getFoodById(foodId),
        foodOptionsService.getFoodOptions(foodId)
      ]);

      activeModalFood = food;
      modalRoot.innerHTML = renderModal(food, optionGroups);
    } catch (error) {
      modalRoot.innerHTML = `<div class="menu-modal__backdrop" data-close-modal></div><section class="menu-modal"><div class="menu-modal__content">${escapeHtml(error.message || 'Không tải được chi tiết món.')}</div></section>`;
    }
  });


  modalRoot.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-modal]')) {
      modalRoot.innerHTML = '';
      activeModalFood = null;
      return;
    }

    const addButton = event.target.closest('[data-add-customized-food]');
    if (!addButton || !activeModalFood) {
      return;
    }

    if (!isFoodAvailable(activeModalFood)) {
      return;
    }

    if (!validateSelectedOptions(modalRoot)) {
      return;
    }

    const payload = buildCustomizedFoodPayload(activeModalFood, modalRoot);
    const quantityInput = modalRoot.querySelector('[data-add-quantity]');
    const noteInput = modalRoot.querySelector('[data-add-note]');
    const quantity = Math.max(1, Number.parseInt(quantityInput?.value, 10) || 1);

    CartContext.addItem({
      ...payload,
      image_url: activeModalFood.image_url || getFoodImage(activeModalFood.food_name),
      quantity,
      note: noteInput?.value || '',
      item_total: Number(payload.total_price || 0) * quantity
    });

    addButton.textContent = 'Đã thêm vào giỏ';
    window.setTimeout(() => {
      modalRoot.innerHTML = '';
      activeModalFood = null;
      window.location.hash = '#/cart';
    }, 450);
  });

  modalRoot.addEventListener('change', (event) => {
    const optionInput = event.target.closest('[data-food-option]');
    if (!optionInput || !activeModalFood) {
      return;
    }

    const group = optionInput.closest('[data-option-group]');
    if (group) {
      validateSelectedOptions(modalRoot);
      enforceMaxSelect(group, optionInput);
    } else {
      validateSelectedOptions(modalRoot);
    }

    const totalPriceNode = modalRoot.querySelector('[data-food-total-price]');
    if (totalPriceNode) {
      const quantity = Math.max(1, Number.parseInt(modalRoot.querySelector('[data-add-quantity]')?.value, 10) || 1);
      totalPriceNode.textContent = formatMoney(calculateOptionTotal(modalRoot, activeModalFood.price) * quantity);
    }
  });

  modalRoot.addEventListener('input', (event) => {
    const quantityInput = event.target.closest('[data-add-quantity]');
    if (!quantityInput || !activeModalFood) {
      return;
    }

    const totalPriceNode = modalRoot.querySelector('[data-food-total-price]');
    if (totalPriceNode) {
      const quantity = Math.max(1, Number.parseInt(quantityInput.value, 10) || 1);
      totalPriceNode.textContent = formatMoney(calculateOptionTotal(modalRoot, activeModalFood.price) * quantity);
    }
  });


  loadInitialData();
};


