import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Role } from './role-model';
import { ApiError } from '../../../types/interface';
import {
  calculatePaginationInfo,
  parseRequestParams,
} from '../../../helpers/filters';

export const getAllRoles = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { where, order, limit, offset, page } = parseRequestParams(req, Role);

  const { rows, count } = await Role.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });

  res.status(200).json({
    data: rows,
    pagination: calculatePaginationInfo(count, limit, page),
  });
};

export const getRoleById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    throw new ApiError(404, 'No Role Found');
  }
  res.status(200).json({ data: role, message: 'Role found successfully' });
};

export const addRole = async (req: Request, res: Response): Promise<void> => {
  const { roleName } = req.body ?? {};
  if (!roleName) {
    throw new ApiError(400, 'Please provide a role name');
  }

  await assertNoDuplicateRole(roleName);

  const role = await Role.create({ roleName });
  res.status(201).json({ data: role, message: 'Role created successfully' });
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const role = await Role.findByPk(req.params.id);
  if (!role) {
    throw new ApiError(404, 'No Role Found');
  }

  const { roleName } = req.body ?? {};
  if (roleName && roleName !== role.roleName) {
    await assertNoDuplicateRole(roleName, role.id);
    role.roleName = roleName;
    await role.save();
  }

  res.status(200).json({ data: role, message: 'Role updated successfully' });
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  // FK constraint (RESTRICT) blocks deletion while users reference the role;
  // that surfaces as a 409 via the central error handler.
  const deleted = await Role.destroy({ where: { id: req.params.id } });
  if (deleted === 0) {
    throw new ApiError(404, 'No Role Found');
  }
  res.status(200).json({ message: 'Role deleted successfully' });
};

async function assertNoDuplicateRole(
  roleName: string,
  excludeId?: number
): Promise<void> {
  const where: Record<string, unknown> = { roleName };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const existing = await Role.findOne({ where });
  if (existing) {
    throw new ApiError(409, 'Role already exists');
  }
}
