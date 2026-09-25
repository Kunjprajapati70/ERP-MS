const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      // Gmail app passwords are often pasted with spaces
      pass: String(config.smtp.password || '').replace(/\s+/g, ''),
    },
  });

  return transporter;
}

/**
 * Sends email asynchronously. Failures are logged and never thrown to callers
 * unless { throwOnError: true } is passed.
 */
async function sendEmail({ to, subject, html, text, throwOnError = false }) {
  const transport = getTransporter();

  if (!transport) {
    logger.warn('Email skipped — SMTP is not configured', { to, subject });
    return { skipped: true };
  }

  try {
    const info = await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text: text || undefined,
    });
    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return { skipped: false, messageId: info.messageId };
  } catch (error) {
    logger.error('Email send failed', { to, subject, message: error.message });
    if (throwOnError) {
      throw error;
    }
    return { skipped: false, failed: true, error: error.message };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
};
