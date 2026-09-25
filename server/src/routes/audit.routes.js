const express = require('express');
const auditController = require('../controllers/audit.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');

const router = express.Router();

router.use(authenticateUser);
router.get('/', authorizePermissions('audit:read'), auditController.list);

module.exports = router;
