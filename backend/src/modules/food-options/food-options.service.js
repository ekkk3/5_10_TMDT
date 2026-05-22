const pool = require('../../config/database');

const mapOptionRow = (row) => ({
  option_id: row.option_id,
  food_id: row.food_id,
  option_name: row.option_name,
  option_type: row.option_type,
  extra_price: row.extra_price,
  is_required: Boolean(row.is_required),
  max_select: row.max_quantity,
  status: row.status
});

const groupOptions = (options) => {
  const groupsByType = new Map();

  options.forEach((option) => {
    if (!groupsByType.has(option.option_type)) {
      groupsByType.set(option.option_type, {
        option_type: option.option_type,
        is_required: false,
        max_select: option.option_type === 'SIZE' ? 1 : 0,
        options: []
      });
    }

    const group = groupsByType.get(option.option_type);
    group.is_required = group.is_required || option.is_required;
    group.max_select = Math.max(group.max_select || 0, option.max_select || 0);
    group.options.push(option);
  });

  return Array.from(groupsByType.values());
};

const getFoodOptionsByFoodId = async (foodId) => {
  const [rows] = await pool.query(
    `
      SELECT
        option_id,
        food_id,
        option_name,
        option_type,
        extra_price,
        is_required,
        max_quantity,
        status
      FROM food_options
      WHERE food_id = ? AND status <> 'HIDDEN'
      ORDER BY
        FIELD(option_type, 'SIZE', 'TOPPING', 'OTHER'),
        extra_price ASC,
        option_name ASC
    `,
    [foodId]
  );

  return groupOptions(rows.map(mapOptionRow));
};

module.exports = {
  getFoodOptionsByFoodId
};
