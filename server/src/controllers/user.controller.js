const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await userService.listUsers(req.query);
  res.json({ success: true, message: 'Users retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, message: 'User retrieved', data: { user } });
});

const create = asyncHandler(async (req, res) => {
  const { user, emailDelivery } = await userService.createUser(req.body, req.user, req);
  let message = 'User created';
  if (emailDelivery?.sent) {
    message = 'User created and login credentials emailed';
  } else if (emailDelivery?.skipped) {
    message = 'User created, but email was skipped because no mail provider is configured';
  } else if (emailDelivery?.failed) {
    message = emailDelivery.error
      ? `User created, but the credentials email failed: ${emailDelivery.error}`
      : 'User created, but the credentials email failed to send';
  }
  res.status(201).json({ success: true, message, data: { user, emailDelivery } });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'User updated', data: { user } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await userService.deleteUser(req.params.id, req.user, req);
  res.json({ success: true, message: 'User deleted', data });
});

const testEmail = asyncHandler(async (req, res) => {
  const to = String(req.body?.to || req.user?.email || '').trim();
  const data = await userService.sendTestEmail(to);
  const message = data.sent
    ? `Test email sent to ${to}`
    : data.skipped
      ? 'Mail is not configured on the server'
      : data.error || 'Test email failed';
  res.status(data.sent ? 200 : 502).json({ success: Boolean(data.sent), message, data });
});

module.exports = { list, getById, create, update, remove, testEmail };
