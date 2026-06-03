const express = require('express');
const supportController = require('./support.controller');
const { requireCustomerAuth } = require('../../middlewares/customer-auth.middleware');

const router = express.Router();

router.post('/tickets', supportController.createTicket);
router.get('/tickets/:code', supportController.getTicketByCode);
router.get('/mine', requireCustomerAuth, supportController.listMyTickets);
router.post('/mine/tickets', requireCustomerAuth, supportController.createTicket);

module.exports = router;
