import { Transaction } from 'sequelize';
import { env } from '../../config/env';
import { Menu } from '../../routes/control/menu/menu-model';
import { Permission } from '../../routes/control/permission/permission-model';
import { Role } from '../../routes/control/role/role-model';
import { User } from '../../routes/control/user/user-model';

/**
 * Seed the Admin role, its full permission set over the given menus, and the
 * default admin user. Top-level menus get read-only; child menus get full CRUD.
 */
export async function seedAdminUser(
  menus: Menu[],
  transaction?: Transaction
): Promise<void> {
  const adminRole = await Role.create({ roleName: 'Admin' }, { transaction });

  const permissions = menus.map((menu) => {
    const isChild = menu.parentId !== null;
    return {
      roleId: adminRole.id,
      menuId: menu.id,
      canRead: true,
      canCreate: isChild,
      canUpdate: isChild,
      canDelete: isChild,
    };
  });

  await Permission.bulkCreate(permissions, { transaction });

  // Password is hashed by the User beforeSave hook.
  await User.create(
    {
      userName: env.seed.adminUserName,
      firstName: 'VEO',
      lastName: 'Admin',
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      roleId: adminRole.id,
    },
    { transaction }
  );
}
