const mongoose = require('mongoose');

const SUPPORT_CATEGORIES = ['ORDER', 'INVOICE', 'PAYMENT', 'PRODUCT', 'DELIVERY', 'TECHNICAL', 'OTHER'];
const SUPPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const SUPPORT_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];

const supportMessageSchema = new mongoose.Schema(
  {
    authorType: { type: String, enum: ['CUSTOMER', 'STAFF'], required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 4000 },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, enum: SUPPORT_CATEGORIES, default: 'OTHER' },
    priority: { type: String, enum: SUPPORT_PRIORITIES, default: 'MEDIUM' },
    status: { type: String, enum: SUPPORT_STATUSES, default: 'OPEN', index: true },
    relatedOrderNumber: { type: String, default: '', trim: true },
    messages: { type: [supportMessageSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
module.exports.SUPPORT_CATEGORIES = SUPPORT_CATEGORIES;
module.exports.SUPPORT_PRIORITIES = SUPPORT_PRIORITIES;
module.exports.SUPPORT_STATUSES = SUPPORT_STATUSES;
