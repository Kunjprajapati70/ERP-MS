/**
 * Local SMTP check: verifies the transporter then sends one email.
 * Usage: node scripts/test-mail.js [optional-recipient]
 * Default recipient: SMTP_USER from server/.env
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { sendEmail, verifyMail, getMailTransport, getSmtpStatus } = require('../src/services/mailService');

async function main() {
  const to = process.argv[2] || process.env.SMTP_USER;
  const status = getSmtpStatus();
  console.log('Mail status:', {
    transport: getMailTransport(),
    configured: status.configured,
    host: status.host,
    user: status.user,
    password: status.password,
  });

  if (!to) {
    console.error('No recipient. Pass an email or set SMTP_USER.');
    process.exit(1);
  }

  const verify = await verifyMail();
  console.log('Verify:', verify);
  if (!verify.ok) {
    process.exit(1);
  }

  const result = await sendEmail({
    to,
    subject: 'Enterprise ERP local mail test',
    html: '<p>Localhost SMTP is working. You can create users and they will receive credentials from this machine.</p>',
    text: 'Localhost SMTP is working. You can create users and they will receive credentials from this machine.',
    throwOnError: true,
  });

  console.log('Send:', { to, sent: true, transport: result.transport, messageId: result.messageId });
}

main().catch((error) => {
  console.error('Mail test failed:', error.message);
  process.exit(1);
});
