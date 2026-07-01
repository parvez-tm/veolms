import { Request, Response } from 'express';
import { sequelize } from '../../../db/sequelize';
import { Permission } from './permission-model';
import { Role } from '../role/role-model';
import { Menu } from '../menu/menu-model';
import { ApiError, PermissionRequest } from '../../../types/interface';
import { flagsToColumns } from '../../../helpers/permission-mapper';
import { invalidateRolePermissions } from '../../../services/permission-cache-service';

/**
 * NOTE (scope): these per-menu permission flags (canRead/canCreate/...) are
 * persisted and drive the login `permissions` map, but they are NOT yet used to
 * authorize requests. Domain access is enforced by role NAME via
 * `requireRole(...)` + ownership (`isAdminOrOwner`). Saving a set only bumps the
 * role's permission version (forcing its users to re-login). Wiring these flags
 * into route guards / the SPA nav is planned future work, out of current scope.
 */
const withRoleAndMenu = [
  { model: Role, as: 'role' },
  { model: Menu, as: 'menu' },
];

export const addPermission = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { roleId, permissions } = (req.body ?? {}) as PermissionRequest;

  if (!roleId || !Array.isArray(permissions)) {
    throw new ApiError(400, 'roleId and a permissions array are required');
  }
  for (const p of permissions) {
    if (!p || typeof p.menuId !== 'number') {
      throw new ApiError(400, 'Each permission requires a numeric menuId');
    }
  }

  const role = await Role.findByPk(roleId);
  if (!role) {
    throw new ApiError(404, 'No Role Found');
  }

  const now = new Date();
  const rows = permissions.map((p) => ({
    roleId,
    menuId: p.menuId,
    ...flagsToColumns(p),
  }));

  // Atomically replace this role's permission set and bump its version.
  await sequelize.transaction(async (transaction) => {
    await Permission.destroy({ where: { roleId }, transaction });
    if (rows.length > 0) {
      await Permission.bulkCreate(rows, { transaction });
    }
    role.lastPermissionUpdate = now;
    await role.save({ transaction });
  });

  // Invalidate caches so outstanding tokens re-validate against the new version.
  await invalidateRolePermissions(roleId);

  const data = await Permission.findAll({
    where: { roleId },
    include: withRoleAndMenu,
  });
  res.status(201).json({ data, message: 'Permissions updated successfully' });
};

export const getAllPermission = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const permissions = await Permission.findAll({ include: withRoleAndMenu });
  res
    .status(200)
    .json({ data: permissions, message: 'Permissions fetched successfully' });
};

export const getPermissionByRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  const permissions = await Permission.findAll({
    where: { roleId: req.params.id },
    include: withRoleAndMenu,
  });
  res
    .status(200)
    .json({ data: permissions, message: 'Permissions fetched successfully' });
};
