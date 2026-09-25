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
  const user = await userService.createUser(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'User created', data: { user } });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'User updated', data: { user } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await userService.deleteUser(req.params.id, req.user, req);
  res.json({ success: true, message: 'User deleted', data });
});

module.exports = { list, getById, create, update, remove };
