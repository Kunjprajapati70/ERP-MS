const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function parseFromAddress(raw) {
  const value = String(raw || '').trim();
  const match = value.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }
  return { name: 'Enterprise ERP', email: value };
}

function getMailTransport() {
  if (config.resendApiKey) return 'resend';
  if (config.brevoApiKey) return 'brevo';
  if (config.smtp.host && config.smtp.user && config.smtp.password) return 'smtp';
  return 'none';
}

function isMailConfigured() {
  return getMailTransport() !== 'none';
}

function getSmtpStatus() {
  const transport = getMailTransport();
  return {
    configured: transport !== 'none',
    transport,
    host: config.smtp.host ? 'set' : 'missing',
    user: config.smtp.user ? 'set' : 'missing',
    password: config.smtp.password ? 'set' : 'missing',
    hint:
      transport === 'smtp' && config.isProduction
        ? 'Render free web services block outbound SMTP (ports 25/465/587). Set BREVO_API_KEY or RESEND_API_KEY to send mail over HTTPS.'
        : undefined,
  };
}

function getTransporter() {
  if (transporter) return transporter;
  if (getMailTransport() !== 'smtp') return null;

  const port = Number(config.smtp.port) || 587;
  const auth = {
    user: config.smtp.user,
    pass: String(config.smtp.password || '').replace(/\s+/g, ''),
  };

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth,
    tls: { minVersion: 'TLSv1.2' },
    family: 4,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 25000,
  });

  return transporter;
}

function smtpBlockedHint(error) {
  const message = String(error?.message || error || '');
  if (/timeout|ETIMEDOUT|ECONNREFUSED|ESOCKET/i.test(message) && config.isProduction) {
    return `${message}. Render free plans block Gmail SMTP. Add BREVO_API_KEY or RESEND_API_KEY (HTTPS), or upgrade the Render instance.`;
  }
  return message;
}

async function sendWithResend({ to, subject, html, text, from }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from.name ? `${from.name} <${from.email}>` : from.email,
      to: [to],
      subject,
      html,
      text: text || undefined,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.name || `Resend HTTP ${response.status}`);
  }
  return body.id;
}

async function sendWithBrevo({ to, subject, html, text, from }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: from.name || 'Enterprise ERP', email: from.email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || undefined,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || JSON.stringify(body) || `Brevo HTTP ${response.status}`);
  }
  return body.messageId;
}

async function sendWithSmtp({ to, subject, html, text, from }) {
  const transport = getTransporter();
  if (!transport) return { skipped: true };
  const info = await transport.sendMail({
    from: from.name ? `${from.name} <${from.email}>` : from.email,
    to,
    subject,
    html,
    text: text || undefined,
  });
  return info.messageId;
}

async function sendEmail({ to, subject, html, text, throwOnError = false }) {
  const transport = getMailTransport();
  const from = parseFromAddress(config.smtp.from || config.smtp.user);

  if (transport === 'none') {
    logger.warn('Email skipped — no mail provider is configured', { to, subject });
    return { skipped: true };
  }

  try {
    let messageId;
    if (transport === 'resend') {
      messageId = await sendWithResend({ to, subject, html, text, from });
    } else if (transport === 'brevo') {
      messageId = await sendWithBrevo({ to, subject, html, text, from });
    } else {
      const smtpResult = await sendWithSmtp({ to, subject, html, text, from });
      if (smtpResult?.skipped) return { skipped: true };
      messageId = smtpResult;
    }
    logger.info('Email sent', { to, subject, transport, messageId });
    return { skipped: false, messageId, transport };
  } catch (error) {
    const message = smtpBlockedHint(error);
    logger.error('Email send failed', { to, subject, transport, message });
    if (throwOnError) {
      const wrapped = new Error(message);
      wrapped.statusCode = 502;
      throw wrapped;
    }
    return { skipped: false, failed: true, error: message, transport };
  }
}

async function verifyMail() {
  const transportName = getMailTransport();
  if (transportName === 'none') {
    return { ok: false, transport: 'none', error: 'No mail provider is configured' };
  }
  if (transportName !== 'smtp') {
    return { ok: true, transport: transportName, verified: 'https-api' };
  }
  const transport = getTransporter();
  try {
    await transport.verify();
    return { ok: true, transport: 'smtp', verified: true };
  } catch (error) {
    return { ok: false, transport: 'smtp', error: error.message };
  }
}

module.exports = {
  sendEmail,
  getTransporter,
  isMailConfigured,
  isSmtpConfigured: isMailConfigured,
  getMailTransport,
  getSmtpStatus,
  verifyMail,
};
