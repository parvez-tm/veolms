declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string;
    CORS_ORIGIN?: string;
    /** Public frontend URL used to build links in transactional emails. */
    APP_URL?: string;

    JWT_SECRET?: string;
    /** Access-token lifetime (e.g. '7d'); sent to the client as a Bearer token. */
    JWT_EXPIRES_IN?: string;

    /** Transactional email (SMTP). When unset, links are logged to the console. */
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_SECURE?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    EMAIL_FROM?: string;

    /** Full Postgres connection URL. Takes precedence over the discrete POSTGRES_* vars. */
    DATABASE_URL?: string;
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_DB?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    /** 'true' to enable TLS for managed Postgres. */
    DATABASE_SSL?: string;

    REDIS_URL?: string;
    REDIS_PERMISSION_TTL?: string;

    /** Cloudflare R2 (S3-compatible) storage. */
    R2_ENDPOINT?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET?: string;
    R2_PLAYBACK_TTL?: string;

    /** Razorpay payment gateway (test mode). */
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    RAZORPAY_WEBHOOK_SECRET?: string;

    ADMIN_USERNAME?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    SEED_ON_START?: string;
  }
}
