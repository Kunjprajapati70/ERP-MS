const Notification = require('../models/Notification');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

async function createNotification({
  userId,
  title,
  message,
  type = 'INFO',
  module = 'SYSTEM',
  link = '',
  metadata = {},
}) {
  try {
    return await Notification.create({
      user: userId,
      title,
      message,
      type,
      module,
      link,
      metadata,
    });
  } catch (error) {
    logger.error('Failed to create notification', { message: error.message });
    return null;
  }
}

async function listNotifications(userId, query) {
  const { page, limit, skip, sort, status } = parseListQuery(query);
  const filter = { user: userId };
  if (status) {
    filter.status = status.toUpperCase();
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, status: 'UNREAD' }),
  ]);

  return {
    ...buildPagedResult({ items, total, page, limit }),
    unreadCount,
  };
}

async function getUnreadCount(userId) {
  return Notification.countDocuments({ user: userId, status: 'UNREAD' });
}

async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw AppError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  if (notification.status !== 'READ') {
    notification.status = 'READ';
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
}

async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, status: 'UNREAD' },
    { $set: { status: 'READ', readAt: new Date() } }
  );
  return { modifiedCount: result.modifiedCount };
}

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
