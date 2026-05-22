import { menuService } from '../../services/menuService.js';
import { foodOptionsService } from '../food-options/foodOptionsService.js';
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
  return ratingValue > 0 ? `${ratingValue.toFixed(1)}/5` : 'Chua co danh gia';
};


const getFoodImage = (foodName) => {
  const seed = encodeURIComponent(foodName || 'fast food');
  return `https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80&ixid=${seed}`;
};


const renderCategories = (categories, activeCategoryId) => `
  <button class="menu-chip ${!activeCategoryId ? 'is-active' : ''}" data-category-id="">Tat ca</button>
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
  const isOutOfStock = food.status === 'OUT_OF_STOCK';
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
        <p>${escapeHtml(food.description || 'Mon ngon dang duoc cap nhat mo ta.')}</p>
        <div class="food-card__meta">
          <span>${escapeHtml(food.category?.category_name || 'Khac')}</span>
          <span>${formatRating(food.average_rating)}</span>
        </div>
        <div class="food-card__actions">
          <button class="button button-secondary" type="button" data-view-detail="${food.food_id}">Chi tiet</button>
          <button class="button button-primary" type="button" data-view-detail="${food.food_id}" ${isOutOfStock ? 'disabled' : ''}>
            ${isOutOfStock ? 'Het hang' : 'Them vao gio'}
          </button>
        </div>
      </div>
    </article>
  `;
};


const renderReviews = (reviews = []) => {
  if (!reviews.length) {
    return '<p class="review-empty">Chua co danh gia</p>';
  }


  return reviews
    .map(
      (review) => `
        <article class="review-item">
          <div>
            <strong>${escapeHtml(review.reviewer_name || 'Khach hang')}</strong>
            <span>${Number(review.rating).toFixed(1)}/5</span>
          </div>
          <p>${escapeHtml(review.comment || 'Khach hang khong de lai binh luan.')}</p>
        </article>
      `
    )
    .join('');
};


const renderModal = (food, optionGroups = []) => {
  const isOutOfStock = food.status === 'OUT_OF_STOCK';
  const imageUrl = food.image_url || getFoodImage(food.food_name);
  const fallbackImage = getFoodImage(food.food_name);


  return `
    <div class="menu-modal__backdrop" data-close-modal></div>
    <section class="menu-modal" role="dialog" aria-modal="true" aria-labelledby="food-detail-title">
      <button class="menu-modal__close" type="button" data-close-modal aria-label="Dong chi tiet">x</button>
      <div class="menu-modal__image">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(food.food_name)}" onerror="this.onerror=null;this.src='${escapeHtml(fallbackImage)}';" />
      </div>
      <div class="menu-modal__content">
        <span class="menu-modal__category">${escapeHtml(food.category?.category_name || 'Khac')}</span>
        <h2 id="food-detail-title">${escapeHtml(food.food_name)}</h2>
        <strong data-food-total-price>${formatMoney(food.price)}</strong>
        <p>${escapeHtml(food.description || 'Mon ngon dang duoc cap nhat mo ta.')}</p>
        <div class="menu-modal__rating">${formatRating(food.average_rating)}</div>
        ${FoodOptionSelector(optionGroups)}
        <button class="button button-primary menu-modal__add" type="button" data-add-customized-food ${isOutOfStock ? 'disabled' : ''}>
          ${isOutOfStock ? 'Het hang' : 'Them vao gio'}
        </button>
        <div class="menu-modal__reviews">
          <h3>Danh gia</h3>
          ${renderReviews(food.reviews)}
        </div>
      </div>
    </section>
  `;
};


const pageStyles = `
  <style>
    .menu-page { padding: 6px 0 24px; }
    .menu-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
    .menu-header h1 { margin: 0 0 8px; font-size: 34px; }
    .menu-header p { margin: 0; max-width: 680px; color: var(--muted); line-height: 1.5; }
    .menu-controls { display: grid; grid-template-columns: minmax(220px, 1fr) 160px 160px auto; gap: 10px; margin-bottom: 18px; }
    .menu-input { width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; font: inherit; color: var(--ink); background: #fff; }
    .menu-categories { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
    .menu-chip { min-height: 38px; border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; background: #fff; color: var(--ink); font-weight: 700; cursor: pointer; }
    .menu-chip.is-active, .menu-chip:hover { background: var(--red); border-color: var(--red); color: #fff; }
    .menu-status { padding: 24px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--muted); }
    .food-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .food-card { overflow: hidden; border: 1px solid var(--line); border-radius: 8px; background: #fff; box-shadow: 0 12px 28px rgba(116, 36, 0, 0.08); }
    .food-card__media { width: 100%; height: 180px; display: block; padding: 0; border: 0; cursor: pointer; background: #f5d3a4; }
    .food-card__media img, .menu-modal__image img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .food-card__body { padding: 14px; }
    .food-card__top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .food-card h3 { margin: 0; font-size: 18px; line-height: 1.25; }
    .food-card__top strong { color: var(--red); white-space: nowrap; }
    .food-card p { min-height: 42px; margin: 10px 0; color: var(--muted); line-height: 1.45; }
    .food-card__meta { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px; color: var(--muted); font-size: 14px; }
    .food-card__actions { display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px; }
    .button:disabled { cursor: not-allowed; opacity: 0.55; }
    .menu-modal-root:not(:empty) { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 18px; }
    .menu-modal__backdrop { position: absolute; inset: 0; background: rgba(36, 19, 10, 0.58); }
    .menu-modal { position: relative; width: min(900px, 100%); max-height: calc(100vh - 36px); overflow: auto; display: grid; grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.1fr); background: #fff; border-radius: 8px; box-shadow: 0 22px 70px rgba(0, 0, 0, 0.3); }
    .menu-modal__close { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border: 0; border-radius: 6px; background: #fff; color: var(--ink); font-weight: 800; cursor: pointer; }
    .menu-modal__image { min-height: 430px; background: #f5d3a4; }
    .menu-modal__content { padding: 28px; }
    .menu-modal__category { color: var(--muted); font-weight: 700; }
    .menu-modal h2 { margin: 8px 0; font-size: 30px; }
    .menu-modal__content > strong { display: block; margin-bottom: 12px; color: var(--red); font-size: 22px; }
    .menu-modal__content > p { color: var(--muted); line-height: 1.6; }
    .menu-modal__rating { margin: 12px 0; font-weight: 800; }
    .menu-modal__add { width: 100%; margin-top: 14px; }
    .food-options { display: grid; gap: 14px; margin-top: 18px; }
    .food-options__empty { margin-top: 16px; padding: 12px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); }
    .food-option-group { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #fffaf3; }
    .food-option-group.has-error { border-color: var(--red); box-shadow: 0 0 0 2px rgba(201, 31, 31, 0.12); }
    .food-option-group__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .food-option-group__header h3 { margin: 0; font-size: 16px; }
    .food-option-group__header span { color: var(--muted); font-size: 13px; font-weight: 700; }
    .food-option-group__choices { display: grid; gap: 8px; }
    .food-option-group__choices--size { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .food-option-choice { min-height: 54px; display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #f0c372; border-radius: 8px; background: #fff; cursor: pointer; }
    .food-option-choice:has(input:checked) { border-color: var(--red); background: #fff1e6; }
    .food-option-choice input { width: 18px; height: 18px; flex: 0 0 auto; accent-color: var(--red); }
    .food-option-choice span { min-width: 0; display: grid; gap: 3px; }
    .food-option-choice strong { font-size: 14px; line-height: 1.2; }
    .food-option-choice small { color: var(--muted); font-weight: 700; }
    .food-option-choice.is-disabled, .food-option-choice.is-limit-disabled { opacity: 0.48; cursor: not-allowed; }
    .food-option-group__error { min-height: 18px; margin: 0; color: var(--red); font-size: 13px; font-weight: 700; }
    .menu-modal__reviews { margin-top: 22px; border-top: 1px solid var(--line); padding-top: 16px; }
    .menu-modal__reviews h3 { margin: 0 0 12px; }
    .review-item { padding: 12px 0; border-bottom: 1px solid #f2d4a6; }
    .review-item div { display: flex; justify-content: space-between; gap: 12px; }
    .review-item p, .review-empty { margin: 8px 0 0; color: var(--muted); }
    @media (max-width: 920px) {
      .menu-controls { grid-template-columns: 1fr 1fr; }
      .food-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .menu-header { display: block; }
      .menu-controls, .food-grid, .menu-modal { grid-template-columns: 1fr; }
      .food-option-group__choices--size { grid-template-columns: 1fr; }
      .menu-modal__image { min-height: 240px; }
      .food-card__actions { grid-template-columns: 1fr; }
    }
  </style>
`;


export const MenuPage = () => `
  ${pageStyles}
  <section class="menu-page" data-menu-page>
    <div class="menu-header">
      <div>
        <h1>Thuc don</h1>
        <p>Tim mon theo ten, danh muc hoac khoang gia de khach hang vãng lai xem nhanh truoc khi them vao gio.</p>
      </div>
    </div>


    <form class="menu-controls" data-menu-form>
      <input class="menu-input" name="keyword" type="search" placeholder="Tim burger, ga ran, do uong..." autocomplete="off" />
      <input class="menu-input" name="minPrice" type="number" min="0" step="1000" placeholder="Gia tu" />
      <input class="menu-input" name="maxPrice" type="number" min="0" step="1000" placeholder="Gia den" />
      <button class="button button-primary" type="submit">Tim kiem</button>
    </form>


    <div class="menu-categories" data-menu-categories></div>
    <div data-menu-content class="menu-status">Dang tai thuc don...</div>
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
      maxPrice: ''
    }
  };

  let activeModalFood = null;


  const setStatus = (message) => {
    contentRoot.className = 'menu-status';
    contentRoot.innerHTML = escapeHtml(message);
  };


  const renderFoods = () => {
    if (!state.foods.length) {
      setStatus('Khong tim thay mon. Hay thu xoa bo loc hoac doi tu khoa.');
      return;
    }


    contentRoot.className = 'food-grid';
    contentRoot.innerHTML = state.foods.map(renderFoodCard).join('');
  };


  const loadFoods = async () => {
    setStatus('Dang tai thuc don...');


    try {
      state.foods = await menuService.getFoods(state.filters);
      renderFoods();
    } catch (error) {
      setStatus(error.message || 'Loi tai du lieu thuc don. Vui long thu lai.');
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
      setStatus(error.message || 'Loi tai du lieu thuc don. Vui long thu lai.');
    }
  };


  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.filters.keyword = formData.get('keyword') || '';
    state.filters.minPrice = formData.get('minPrice') || '';
    state.filters.maxPrice = formData.get('maxPrice') || '';
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
    modalRoot.innerHTML = '<div class="menu-modal__backdrop"></div><section class="menu-modal"><div class="menu-modal__content">Dang tai chi tiet mon...</div></section>';


    try {
      const foodId = detailButton.dataset.viewDetail;
      const [food, optionGroups] = await Promise.all([
        menuService.getFoodById(foodId),
        foodOptionsService.getFoodOptions(foodId)
      ]);

      activeModalFood = food;
      modalRoot.innerHTML = renderModal(food, optionGroups);
    } catch (error) {
      modalRoot.innerHTML = `<div class="menu-modal__backdrop" data-close-modal></div><section class="menu-modal"><div class="menu-modal__content">${escapeHtml(error.message || 'Khong tai duoc chi tiet mon.')}</div></section>`;
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

    if (!validateSelectedOptions(modalRoot)) {
      return;
    }

    const payload = buildCustomizedFoodPayload(activeModalFood, modalRoot);
    console.log('Customized food payload:', payload);
    addButton.textContent = 'Da ghi payload vao console';
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
      totalPriceNode.textContent = formatMoney(calculateOptionTotal(modalRoot, activeModalFood.price));
    }
  });


  loadInitialData();
};


