import dotenv from 'dotenv';

// Load .env before any value is read; quiet suppresses dotenv 17's startup banner.
dotenv.config({ quiet: true });

/** Read a required env var, throwing at startup if it is missing. */
function required(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Read an optional env var, falling back to a default. */
function optional(name: keyof NodeJS.ProcessEnv, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');

const r2 = {
  endpoint: optional('R2_ENDPOINT', ''),
  accessKeyId: optional('R2_ACCESS_KEY_ID', ''),
  secretAccessKey: optional('R2_SECRET_ACCESS_KEY', ''),
  bucket: optional('R2_BUCKET', ''),
  /** TTL (seconds) for short-lived presigned playback/upload URLs. */
  urlTtlSeconds: Number(optional('R2_PLAYBACK_TTL', '300')),
  configured: false,
};
r2.configured = !!(
  r2.endpoint &&
  r2.accessKeyId &&
  r2.secretAccessKey &&
  r2.bucket
);

const razorpay = {
  keyId: optional('RAZORPAY_KEY_ID', ''),
  keySecret: optional('RAZORPAY_KEY_SECRET', ''),
  /** Secret configured on the Razorpay webhook (separate from the API secret). */
  webhookSecret: optional('RAZORPAY_WEBHOOK_SECRET', ''),
  /** Whether order creation + checkout is enabled. */
  configured: false,
};
razorpay.configured = !!(razorpay.keyId && razorpay.keySecret);

const email = {
  host: optional('SMTP_HOST', ''),
  port: Number(optional('SMTP_PORT', '587')),
  secure: optional('SMTP_SECURE', 'false') === 'true',
  user: optional('SMTP_USER', ''),
  pass: optional('SMTP_PASS', ''),
  from: optional('EMAIL_FROM', 'VeoLMS <no-reply@veolms.local>'),
  /** When false, email links are logged to the console (dev fallback). */
  configured: false,
};
email.configured = !!(email.host && email.user && email.pass);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(optional('PORT', '5005')),
  corsOrigin: optional('CORS_ORIGIN', '*'),
  /** Public URL of the frontend, used to build links in transactional emails. */
  appUrl: optional('APP_URL', 'http://localhost:5173'),

  jwt: {
    secret: required('JWT_SECRET'),
    /** Access-token lifetime. Stored client-side and sent as a Bearer token. */
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  database: {
    url: process.env.DATABASE_URL,
    host: optional('POSTGRES_HOST', 'localhost'),
    port: Number(optional('POSTGRES_PORT', '5432')),
    name: optional('POSTGRES_DB', 'veolms'),
    user: optional('POSTGRES_USER', 'postgres'),
    password: optional('POSTGRES_PASSWORD', 'postgres'),
    /** Enable TLS for managed/hosted Postgres. */
    ssl: optional('DATABASE_SSL', 'false') === 'true',
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
    /** TTL (seconds) for cached role permission data. */
    permissionTtlSeconds: Number(optional('REDIS_PERMISSION_TTL', '3600')),
  },

  /** Cloudflare R2 (S3-compatible) object storage for video/file assets. */
  r2,

  /** Razorpay payment gateway (test mode for the challenge). */
  razorpay,

  /** Transactional email (password reset + contact form). Falls back to console logging. */
  email,

  seed: {
    /** Seed the Admin role/menus/admin user when the database is empty. */
    enabled: optional('SEED_ON_START', 'true') === 'true',
    adminUserName: optional('ADMIN_USERNAME', 'admin'),
    adminEmail: optional('ADMIN_EMAIL', 'admin@veolms.local'),
    adminPassword: optional('ADMIN_PASSWORD', 'Admin@123'),
  },
} as const;
