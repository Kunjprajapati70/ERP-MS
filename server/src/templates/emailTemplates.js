function welcomeEmailTemplate({ name, loginUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #122021; line-height: 1.5;">
      <h2>Welcome to Enterprise ERP</h2>
      <p>Hi ${name},</p>
      <p>Your account has been created successfully.</p>
      <p><a href="${loginUrl}" style="background:#0F3D3E;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">Sign in</a></p>
      <p>If you did not create this account, please ignore this email.</p>
    </div>
  `;
}

function adminCreatedUserCredentialsTemplate({ name, email, password, loginUrl, roleName }) {
  const safeName = String(name || 'User').replace(/</g, '&lt;');
  const safeEmail = String(email || '').replace(/</g, '&lt;');
  const safePassword = String(password || '').replace(/</g, '&lt;');
  const safeRole = String(roleName || '').replace(/</g, '&lt;');

  return `
    <div style="font-family: Arial, sans-serif; color: #122021; line-height: 1.55; max-width: 560px;">
      <h2 style="margin-bottom: 8px;">Your ERP account is ready</h2>
      <p>Hi ${safeName},</p>
      <p>An administrator created an Enterprise ERP account for you. Use the credentials below to sign in.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0; background: #f4f8fa; border-radius: 8px;">
        <tr>
          <td style="padding: 10px 14px; font-weight: 600; width: 140px;">Login ID (Email)</td>
          <td style="padding: 10px 14px;"><code>${safeEmail}</code></td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-weight: 600;">Temporary password</td>
          <td style="padding: 10px 14px;"><code>${safePassword}</code></td>
        </tr>
        ${
          safeRole
            ? `<tr>
          <td style="padding: 10px 14px; font-weight: 600;">Role</td>
          <td style="padding: 10px 14px;">${safeRole}</td>
        </tr>`
            : ''
        }
      </table>
      <p>
        <a href="${loginUrl}" style="display:inline-block;background:#0B4F6C;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">
          Sign in to ERP
        </a>
      </p>
      <p style="color:#4A6578;font-size:13px;">
        For security, please change your password after your first login
        (Account → Change password). Do not share this email with others.
      </p>
    </div>
  `;
}

function passwordResetEmailTemplate({ name, resetUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #122021; line-height: 1.5;">
      <h2>Password reset request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="background:#0F3D3E;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">Reset password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
}

function securityAlertEmailTemplate({ name, action }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #122021; line-height: 1.5;">
      <h2>Security notification</h2>
      <p>Hi ${name},</p>
      <p>${action}</p>
      <p>If this was not you, reset your password immediately and contact your administrator.</p>
    </div>
  `;
}

module.exports = {
  welcomeEmailTemplate,
  adminCreatedUserCredentialsTemplate,
  passwordResetEmailTemplate,
  securityAlertEmailTemplate,
};
