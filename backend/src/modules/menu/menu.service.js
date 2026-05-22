const pool = require('../../config/database');


const mapFoodRow = (row) => ({
  food_id: row.food_id,
  food_name: row.food_name,
  description: row.description,
  price: row.price,
  image_url: row.image_url,
  category: {
    category_id: row.category_id,
    category_name: row.category_name
  },
  status: row.status,
  average_rating: row.average_rating === null ? null : Number(row.average_rating)
});


const getCategories = async () => {
  const [rows] = await pool.query(
    `
      SELECT category_id, category_name, description, status
      FROM categories
      WHERE status = 'ACTIVE'
      ORDER BY category_name ASC
    `
  );


  return rows;
};


const getFoods = async (filters = {}) => {
  const conditions = ['f.status = ?'];
  const params = ['ACTIVE'];


  if (filters.keyword) {
    conditions.push('(f.food_name LIKE ? OR f.description LIKE ?)');
    const keyword = `%${filters.keyword.trim()}%`;
    params.push(keyword, keyword);
  }


  if (filters.categoryId) {
    conditions.push('f.category_id = ?');
    params.push(filters.categoryId);
  }


  if (filters.minPrice !== undefined) {
    conditions.push('f.price >= ?');
    params.push(filters.minPrice);
  }


  if (filters.maxPrice !== undefined) {
    conditions.push('f.price <= ?');
    params.push(filters.maxPrice);
  }


  const [rows] = await pool.query(
    `
      SELECT
        f.food_id,
        f.food_name,
        f.description,
        f.price,
        f.image_url,
        f.status,
        c.category_id,
        c.category_name,
        COALESCE(ROUND(AVG(CASE WHEN r.status = 'APPROVED' THEN r.rating END), 2), f.average_rating) AS average_rating
      FROM foods f
      INNER JOIN categories c ON c.category_id = f.category_id
      LEFT JOIN reviews r ON r.food_id = f.food_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY
        f.food_id,
        f.food_name,
        f.description,
        f.price,
        f.image_url,
        f.status,
        f.average_rating,
        c.category_id,
        c.category_name
      ORDER BY f.food_name ASC
    `,
    params
  );


  return rows.map(mapFoodRow);
};


const getFoodById = async (foodId) => {
  const [foodRows] = await pool.query(
    `
      SELECT
        f.food_id,
        f.food_name,
        f.description,
        f.price,
        f.image_url,
        f.status,
        c.category_id,
        c.category_name,
        COALESCE(ROUND(AVG(CASE WHEN r.status = 'APPROVED' THEN r.rating END), 2), f.average_rating) AS average_rating
      FROM foods f
      INNER JOIN categories c ON c.category_id = f.category_id
      LEFT JOIN reviews r ON r.food_id = f.food_id
      WHERE f.food_id = ? AND f.status = 'ACTIVE'
      GROUP BY
        f.food_id,
        f.food_name,
        f.description,
        f.price,
        f.image_url,
        f.status,
        f.average_rating,
        c.category_id,
        c.category_name
      LIMIT 1
    `,
    [foodId]
  );


  if (!foodRows.length) {
    return null;
  }


  const [reviews] = await pool.query(
    `
      SELECT
        r.review_id,
        r.rating,
        r.comment,
        r.image_url,
        r.created_at,
        u.full_name AS reviewer_name
      FROM reviews r
      INNER JOIN users u ON u.user_id = r.user_id
      WHERE r.food_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
    `,
    [foodId]
  );


  return {
    ...mapFoodRow(foodRows[0]),
    reviews
  };
};


module.exports = {
  getCategories,
  getFoods,
  getFoodById
};
