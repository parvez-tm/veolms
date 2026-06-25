import { sequelize } from './sequelize';
import { defineAssociations } from './associations';
import { env } from '../config/env';
import { Role } from '../routes/control/role/role-model';
import { User } from '../routes/control/user/user-model';
import { seedMenu } from './seeders-data/menu-seed';
import { seedAdminUser } from './seeders-data/user-seed';
import { seedLmsData } from './seeders-data/lms-seed';

/**
 * Authenticate, wire associations, sync the schema, and seed an empty database.
 * In development the schema is `alter`ed to match the models; in production it
 * is only created if missing (use real migrations for production schema changes).
 */
export async function connectDB(): Promise<void> {
  defineAssociations();

  await sequelize.authenticate();
  console.log('Postgres connected');

  await sequelize.sync({ alter: !env.isProduction });

  if (env.seed.enabled) {
    await seedIfEmpty();
  }
}

/** Seed baseline data only when the database has no roles/users yet. */
async function seedIfEmpty(): Promise<void> {
  const [roleCount, userCount] = await Promise.all([Role.count(), User.count()]);
  if (roleCount > 0 || userCount > 0) {
    return;
  }

  await sequelize.transaction(async (transaction) => {
    const menus = await seedMenu(transaction);
    await seedAdminUser(menus, transaction);
    await seedLmsData(menus, transaction);
  });

  console.log(
    'Database seeded: roles (Admin/Instructor/Student), menus, demo users, demo catalog (4 courses)'
  );
}

export default connectDB;
