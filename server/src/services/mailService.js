const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function isSmtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.password);
}

function getSmtpStatus() {
  return {
    configured: isSmtpConfigured(),
    host: config.smtp.host ? 'set' : 'missing',
    user: config.smtp.user ? 'set' : 'missing',
    password: config.smtp.password ? 'set' : 'missing',
  };
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!isSmtpConfigured()) {
    return null;
  }

  const auth = {
    user: config.smtp.user,
    // Gmail app passwords are often pasted with spaces
    pass: String(config.smtp.password || '').replace(/\s+/g, ''),
  };
  const timeouts = {
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };
  const isGmail = /gmail\.com$/i.test(config.smtp.host) || /gmail\.com$/i.test(config.smtp.user);

  transporter = isGmail
    ? nodemailer.createTransport({ service: 'gmail', auth, ...timeouts })
    : nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth,
        ...timeouts,
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
  isSmtpConfigured,
  getSmtpStatus,
};
