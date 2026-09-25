/**
 * Payment gateway adapter (Razorpay-ready).
 * Secrets stay on the server — never expose PAYMENT_KEY_SECRET to the client.
 *
 * When PAYMENT_KEY_ID and PAYMENT_KEY_SECRET are set, createCheckoutOrder /
 * verifyPaymentSignature will call the provider. Until then they return a
 * structured "not configured" response so the portal can show Pay later UX.
 */
const crypto = require('crypto');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function isConfigured() {
  return Boolean(process.env.PAYMENT_KEY_ID && process.env.PAYMENT_KEY_SECRET);
}

function getPublicKey() {
  return process.env.PAYMENT_KEY_ID || null;
}

/**
 * Create a checkout order for an invoice. Returns provider order id + public key.
 */
async function createCheckoutOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  if (!isConfigured()) {
    return {
      configured: false,
      message: 'Online payments are not configured yet. Contact support to pay offline.',
    };
  }

  // Placeholder for Razorpay Orders API integration.
  // Keep amount in paise for INR when wiring the SDK.
  logger.info('Payment gateway order requested', {
    amount,
    currency,
    receipt,
    notes,
  });

  throw AppError.serviceUnavailable(
    'Payment gateway is configured but not fully enabled. Contact support.',
    'PAYMENT_GATEWAY_PENDING'
  );
}

/**
 * Verify provider webhook / checkout signature on the server only.
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!isConfigured()) {
    throw AppError.badRequest('Payment gateway is not configured', 'PAYMENT_NOT_CONFIGURED');
  }

  const secret = process.env.PAYMENT_KEY_SECRET;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  if (expected !== signature) {
    throw AppError.badRequest('Invalid payment signature', 'INVALID_PAYMENT_SIGNATURE');
  }

  return true;
}

module.exports = {
  isConfigured,
  getPublicKey,
  createCheckoutOrder,
  verifyPaymentSignature,
  // Expose config hint for health/debug without leaking secrets
  getGatewayStatus: () => ({
    configured: isConfigured(),
    keyIdPresent: Boolean(process.env.PAYMENT_KEY_ID),
    clientUrl: config.clientUrl,
  }),
};
