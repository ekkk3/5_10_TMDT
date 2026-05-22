const express = require('express');
const { successResponse } = require('../../common/response.helper');

const router = express.Router();

router.get('/', (req, res) => {
  return successResponse(res, 'API is running');
});

module.exports = router;
