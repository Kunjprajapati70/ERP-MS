const roleService = require('../services/roleService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await roleService.listRoles(req.query);
  res.json({ success: true, message: 'Roles retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  res.json({ success: true, message: 'Role retrieved', data: { role } });
});

const update = asyncHandler(async (req, res) => {
  const role = await roleService.updateRolePermissions(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Role updated', data: { role } });
});

const permissions = asyncHandler(async (req, res) => {
  const data = await roleService.getPermissionCatalog();
  res.json({ success: true, message: 'Permission catalog', data });
});

module.exports = { list, getById, update, permissions };
