import { Sequelize, Options } from 'sequelize';
import pg from 'pg';
import { env } from '../config/env';

// Parse Postgres BIGINT (int8) columns as JS numbers instead of strings.
// Safe here: no table is expected to exceed Number.MAX_SAFE_INTEGER.
pg.defaults.parseInt8 = true;

const commonOptions: Options = {
  dialect: 'postgres',
  logging: false,
  define: {
    // Keep camelCase column names to match the model/attribute names.
    underscored: false,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  // TLS for managed/hosted Postgres (Neon, RDS, DigitalOcean, Supabase, ...).
  ...(env.database.ssl
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {}),
};

/**
 * Shared Sequelize instance. Prefers DATABASE_URL when provided, otherwise
 * builds the connection from the discrete POSTGRES_* settings.
 */
export const sequelize = env.database.url
  ? new Sequelize(env.database.url, commonOptions)
  : new Sequelize(env.database.name, env.database.user, env.database.password, {
      ...commonOptions,
      host: env.database.host,
      port: env.database.port,
    });
