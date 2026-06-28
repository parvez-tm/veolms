// Set the env the modules need BEFORE any of them import config/env.ts.
// (dotenv.config() in env.ts will not override already-set process.env values,
// so these deterministic test values win over whatever is in .env.)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
