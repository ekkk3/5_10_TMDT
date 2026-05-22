const crypto = require('crypto');

const generateOrderCode = () => {
  const date = new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();

  return `G${year}${month}${day}${randomPart}`;
};

module.exports = {
  generateOrderCode
};
