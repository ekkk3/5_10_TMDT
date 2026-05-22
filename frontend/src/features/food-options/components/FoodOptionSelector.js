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

const getGroupTitle = (optionType) => {
  if (optionType === 'SIZE') return 'Chon size';
  if (optionType === 'TOPPING') return 'Chon topping';
  return 'Tuy chon khac';
};

const renderOptionPrice = (extraPrice) => {
  const price = Number(extraPrice || 0);
  return price > 0 ? `+${formatMoney(price)}` : 'Mien phi';
};

const renderEmptyOptions = () => `
  <div class="food-options__empty">Mon nay chua co tuy chon them.</div>
`;

export const SizeSelector = (group) => `
  <section class="food-option-group" data-option-group="SIZE" data-required="${group.is_required ? 'true' : 'false'}" data-max-select="1">
    <div class="food-option-group__header">
      <h3>${getGroupTitle('SIZE')}</h3>
      ${group.is_required ? '<span>Bat buoc</span>' : ''}
    </div>
    <div class="food-option-group__choices food-option-group__choices--size">
      ${group.options
        .map((option) => {
          const isOutOfStock = option.status === 'OUT_OF_STOCK';
          return `
            <label class="food-option-choice ${isOutOfStock ? 'is-disabled' : ''}">
              <input
                type="radio"
                name="food-size-option"
                value="${option.option_id}"
                data-food-option
                data-option-id="${option.option_id}"
                data-option-type="${option.option_type}"
                data-option-name="${escapeHtml(option.option_name)}"
                data-extra-price="${option.extra_price || 0}"
                data-option-status="${option.status}"
                ${isOutOfStock ? 'disabled' : ''}
              />
              <span>
                <strong>${escapeHtml(option.option_name)}</strong>
                <small>${isOutOfStock ? 'Het hang' : renderOptionPrice(option.extra_price)}</small>
              </span>
            </label>
          `;
        })
        .join('')}
    </div>
    <p class="food-option-group__error" data-option-error="SIZE"></p>
  </section>
`;

export const ToppingSelector = (group) => {
  const maxSelect = Number(group.max_select || 0);

  return `
    <section class="food-option-group" data-option-group="TOPPING" data-required="${group.is_required ? 'true' : 'false'}" data-max-select="${maxSelect}">
      <div class="food-option-group__header">
        <h3>${getGroupTitle('TOPPING')}</h3>
        <span>${maxSelect > 0 ? `Toi da ${maxSelect}` : 'Tuy chon'}</span>
      </div>
      <div class="food-option-group__choices">
        ${group.options
          .map((option) => {
            const isOutOfStock = option.status === 'OUT_OF_STOCK';
            return `
              <label class="food-option-choice ${isOutOfStock ? 'is-disabled' : ''}">
                <input
                  type="checkbox"
                  value="${option.option_id}"
                  data-food-option
                  data-option-id="${option.option_id}"
                  data-option-type="${option.option_type}"
                  data-option-name="${escapeHtml(option.option_name)}"
                  data-extra-price="${option.extra_price || 0}"
                  data-option-status="${option.status}"
                  ${isOutOfStock ? 'disabled' : ''}
                />
                <span>
                  <strong>${escapeHtml(option.option_name)}</strong>
                  <small>${isOutOfStock ? 'Het hang' : renderOptionPrice(option.extra_price)}</small>
                </span>
              </label>
            `;
          })
          .join('')}
      </div>
      <p class="food-option-group__error" data-option-error="TOPPING"></p>
    </section>
  `;
};

const OtherOptionSelector = (group) => `
  <section class="food-option-group" data-option-group="${escapeHtml(group.option_type)}" data-required="${group.is_required ? 'true' : 'false'}" data-max-select="${Number(group.max_select || 0)}">
    <div class="food-option-group__header">
      <h3>${escapeHtml(getGroupTitle(group.option_type))}</h3>
      ${group.is_required ? '<span>Bat buoc</span>' : ''}
    </div>
    <div class="food-option-group__choices">
      ${group.options
        .map((option) => {
          const isOutOfStock = option.status === 'OUT_OF_STOCK';
          return `
            <label class="food-option-choice ${isOutOfStock ? 'is-disabled' : ''}">
              <input
                type="checkbox"
                value="${option.option_id}"
                data-food-option
                data-option-id="${option.option_id}"
                data-option-type="${option.option_type}"
                data-option-name="${escapeHtml(option.option_name)}"
                data-extra-price="${option.extra_price || 0}"
                data-option-status="${option.status}"
                ${isOutOfStock ? 'disabled' : ''}
              />
              <span>
                <strong>${escapeHtml(option.option_name)}</strong>
                <small>${isOutOfStock ? 'Het hang' : renderOptionPrice(option.extra_price)}</small>
              </span>
            </label>
          `;
        })
        .join('')}
    </div>
    <p class="food-option-group__error" data-option-error="${escapeHtml(group.option_type)}"></p>
  </section>
`;

export const FoodOptionSelector = (optionGroups = []) => {
  if (!optionGroups.length) {
    return renderEmptyOptions();
  }

  return `
    <div class="food-options" data-food-options>
      ${optionGroups
        .map((group) => {
          if (group.option_type === 'SIZE') return SizeSelector(group);
          if (group.option_type === 'TOPPING') return ToppingSelector(group);
          return OtherOptionSelector(group);
        })
        .join('')}
    </div>
  `;
};

export const getSelectedOptions = (root) =>
  Array.from(root.querySelectorAll('[data-food-option]:checked')).map((input) => ({
    option_id: Number(input.dataset.optionId),
    option_name: input.dataset.optionName,
    option_type: input.dataset.optionType,
    extra_price: Number(input.dataset.extraPrice || 0)
  }));

export const calculateOptionTotal = (root, basePrice) =>
  getSelectedOptions(root).reduce((total, option) => total + option.extra_price, Number(basePrice || 0));

export const validateSelectedOptions = (root) => {
  let isValid = true;

  root.querySelectorAll('[data-option-group]').forEach((group) => {
    const optionType = group.dataset.optionGroup;
    const isRequired = group.dataset.required === 'true';
    const checkedCount = group.querySelectorAll('[data-food-option]:checked').length;
    const errorNode = group.querySelector(`[data-option-error="${optionType}"]`);

    group.classList.remove('has-error');
    if (errorNode) errorNode.textContent = '';

    if (isRequired && checkedCount === 0) {
      isValid = false;
      group.classList.add('has-error');
      if (errorNode) {
        errorNode.textContent = optionType === 'SIZE' ? 'Vui long chon size.' : 'Vui long chon tuy chon bat buoc.';
      }
    }
  });

  return isValid;
};

export const enforceMaxSelect = (group, changedInput) => {
  const maxSelect = Number(group.dataset.maxSelect || 0);
  if (!maxSelect || changedInput.type !== 'checkbox') {
    return;
  }

  const checkedCount = group.querySelectorAll('[data-food-option]:checked').length;
  const uncheckedInputs = group.querySelectorAll('[data-food-option]:not(:checked)');
  const errorNode = group.querySelector(`[data-option-error="${group.dataset.optionGroup}"]`);

  uncheckedInputs.forEach((input) => {
    const isOutOfStock = input.dataset.optionStatus === 'OUT_OF_STOCK';
    input.disabled = isOutOfStock || checkedCount >= maxSelect;
    input.closest('.food-option-choice')?.classList.toggle('is-limit-disabled', !isOutOfStock && checkedCount >= maxSelect);
  });

  if (errorNode) {
    errorNode.textContent = checkedCount >= maxSelect ? `Da dat gioi han ${maxSelect} topping.` : '';
  }
};

export const buildCustomizedFoodPayload = (food, root) => ({
  food_id: food.food_id,
  food_name: food.food_name,
  base_price: Number(food.price || 0),
  total_price: calculateOptionTotal(root, food.price),
  selected_options: getSelectedOptions(root)
});
