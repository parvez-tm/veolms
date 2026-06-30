import { Transaction } from 'sequelize';
import { Menu } from '../../routes/control/menu/menu-model';
import { Permission } from '../../routes/control/permission/permission-model';
import { Role } from '../../routes/control/role/role-model';

interface Grant {
  routeLink: string;
  read?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
}

/** Grant a role a set of menu permissions, resolving menus by routeLink. */
async function grantMenuPermissions(
  roleId: number,
  menus: Menu[],
  grants: Grant[],
  transaction: Transaction
): Promise<void> {
  const byRoute = new Map(menus.map((m) => [m.routeLink, m]));
  const rows = grants
    .map((g) => {
      const menu = byRoute.get(g.routeLink);
      if (!menu) return null;
      return {
        roleId,
        menuId: menu.id,
        canRead: g.read ?? true,
        canCreate: g.create ?? false,
        canUpdate: g.update ?? false,
        canDelete: g.delete ?? false,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length) {
    await Permission.bulkCreate(rows, { transaction });
  }
}

/**
 * Seed the Instructor and Student roles with their menu permissions. This is
 * essential bootstrap (signup creates a Student; become-instructor needs the
 * Instructor role), NOT demo content: no sample users, categories, or courses
 * are created. The catalog starts empty and is filled by real admins/instructors
 * through the app. Runs only on an empty database (see connectDB -> seedIfEmpty).
 */
export async function seedLmsRoles(
  menus: Menu[],
  transaction?: Transaction
): Promise<void> {
  const tx = transaction as Transaction;

  const instructorRole = await Role.create(
    { roleName: 'Instructor' },
    { transaction }
  );
  const studentRole = await Role.create(
    { roleName: 'Student' },
    { transaction }
  );

  await grantMenuPermissions(
    instructorRole.id,
    menus,
    [
      { routeLink: 'admin', read: true },
      { routeLink: 'admin/courses', read: true, create: true, update: true, delete: true },
      { routeLink: 'admin/categories', read: true },
      { routeLink: 'my-learning', read: true },
    ],
    tx
  );
  await grantMenuPermissions(
    studentRole.id,
    menus,
    [
      { routeLink: 'user-dashboard', read: true },
      { routeLink: 'my-learning', read: true },
    ],
    tx
  );
}
