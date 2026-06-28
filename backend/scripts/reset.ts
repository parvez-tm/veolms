/**
 * DESTRUCTIVE reset — wipes ALL application data for a clean start.
 *
 *   1. Drops every table + enum type in the Postgres `public` schema. The app
 *      recreates the schema via `sequelize.sync()` and reseeds (roles, menus,
 *      demo catalog) on the next start, since the DB is then empty.
 *   2. Deletes every object under the app's R2 prefixes.
 *
 * It reads the SAME .env the app uses (config/env.ts → dotenv), so it always
 * targets whatever Postgres + R2 your env points at. Run it from `backend/`:
 *
 *     npm run reset -- --yes
 *     # or: npx tsx scripts/reset.ts --yes
 *
 * The `--yes` flag (or CONFIRM=1) is required so it can never run by accident.
 */
import { sequelize } from '../src/db/sequelize';
import { env } from '../src/config/env';
import { isStorageConfigured, deletePrefix } from '../src/services/storage-service';

// Every top-level key prefix the app writes under (see storage-service +
// media-controller KEY_PREFIX + hls-service). Scoped on purpose so a shared
// bucket's unrelated objects are left alone.
const R2_PREFIXES = [
  'course/', // course-scoped uploads + course/<id>/hls/<assetId>/
  'hls/', // flat HLS fallback (hls/<assetId>/)
  'videos/',
  'thumbnails/',
  'files/',
  'avatars/',
];

async function wipeDatabase(): Promise<void> {
  const target = env.database.url ? '(DATABASE_URL)' : `${env.database.host}/${env.database.name}`;
  console.log(`\n[db]  Dropping all tables + enum types in "${target}" ...`);
  // Drop every table, then every enum type, in the public schema.
  await sequelize.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
      FOR r IN (
        SELECT t.typname
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log('[db]  done — schema is empty (the app recreates + reseeds on next start).');
}

async function wipeR2(): Promise<void> {
  if (!isStorageConfigured()) {
    console.log('\n[r2]  R2 not configured (R2_* env unset) — skipping object cleanup.');
    return;
  }
  console.log(`\n[r2]  Deleting objects in bucket "${env.r2.bucket}" under: ${R2_PREFIXES.join(' ')}`);
  for (const prefix of R2_PREFIXES) {
    await deletePrefix(prefix);
    console.log(`[r2]  cleared ${prefix}`);
  }
  console.log('[r2]  done.');
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes('--yes') || process.env.CONFIRM === '1';
  if (!confirmed) {
    console.error(
      'Refusing to run without confirmation.\n' +
        'This permanently DELETES ALL data (Postgres tables + R2 objects)\n' +
        'for the env this process loads. Re-run with:\n\n' +
        '    npm run reset -- --yes\n'
    );
    process.exit(1);
  }

  try {
    await wipeDatabase();
    await wipeR2();
    console.log('\n✓ Clean. Start the backend to recreate the schema and reseed.\n');
  } catch (err) {
    console.error('\n✗ Reset failed:', (err as Error).message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
