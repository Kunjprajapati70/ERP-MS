const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticateUser);

router.get('/overview', authorizePermissions('dashboard:read'), dashboardController.overview);
router.get('/sales-trend', authorizePermissions('dashboard:read'), dashboardController.salesTrend);

module.exports = router;
