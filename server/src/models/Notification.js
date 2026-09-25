const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM'],
      default: 'INFO',
      index: true,
    },
    module: {
      type: String,
      default: 'SYSTEM',
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['UNREAD', 'READ'],
      default: 'UNREAD',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
