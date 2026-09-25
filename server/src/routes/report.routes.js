const express = require('express');
const reportController = require('../controllers/report.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticateUser);

router.get('/sales', authorizePermissions('reports:read'), reportController.sales);
router.get('/receivables', authorizePermissions('reports:read'), reportController.receivables);
router.get('/inventory', authorizePermissions('reports:read'), reportController.inventory);
router.get('/payments', authorizePermissions('reports:read'), reportController.payments);

module.exports = router;
