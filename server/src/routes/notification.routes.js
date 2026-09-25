const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authenticateUser = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticateUser);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
