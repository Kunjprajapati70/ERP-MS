const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user._id, req.query);
  res.json({ success: true, message: 'Notifications retrieved', data });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, message: 'Unread count', data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data: { notification } });
});

const markAllRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllAsRead(req.user._id);
  res.json({ success: true, message: 'All notifications marked as read', data });
});

module.exports = { list, unreadCount, markRead, markAllRead };
