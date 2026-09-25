const Role = require('../models/Role');
const AppError = require('../utils/AppError');
const { ALL_PERMISSIONS } = require('../constants/roles');
const { writeAuditLog } = require('./auditService');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');

async function listRoles(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query, {
    defaultSort: 'name',
  });
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Role.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Role.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getRoleById(id) {
  const role = await Role.findById(id).lean();
  if (!role) {
    throw AppError.notFound('Role not found', 'ROLE_NOT_FOUND');
  }
  return role;
}

async function updateRolePermissions(id, { permissions, displayName, description, isActive }, actor, req) {
  const role = await Role.findById(id);
  if (!role) {
    throw AppError.notFound('Role not found', 'ROLE_NOT_FOUND');
  }

  if (permissions) {
    const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
    if (invalid.length) {
      throw AppError.validation('Invalid permissions provided', {
        invalid,
        allowed: ALL_PERMISSIONS,
      });
    }
    role.permissions = [...new Set(permissions)];
  }

  if (displayName !== undefined) role.displayName = displayName;
  if (description !== undefined) role.description = description;
  if (isActive !== undefined && !role.isSystem) {
    role.isActive = isActive;
  }

  await role.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'ROLE_UPDATED',
    module: 'ROLES',
    recordId: role._id.toString(),
    metadata: { name: role.name, permissionsCount: role.permissions.length },
    req,
  });

  return role.toObject();
}

async function getPermissionCatalog() {
  return { permissions: ALL_PERMISSIONS };
}

module.exports = {
  listRoles,
  getRoleById,
  updateRolePermissions,
  getPermissionCatalog,
};
