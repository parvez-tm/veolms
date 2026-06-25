import { Router } from 'express';
import { auth_middleware } from '../../../middleware/auth-middleware';
import { requireRole } from '../../../middleware/role-middleware';
import {
  paymentLimiter,
  webhookLimiter,
} from '../../../middleware/rate-limit-middleware';
import { asyncHandler } from '../../../helpers/async-handler';
import {
  createPaymentOrder,
  verifyPayment,
  paymentWebhook,
  myPayments,
  allPayments,
  cleanupPayments,
} from './payment-controller';

const router = Router();

// Public, server-to-server: authenticated by HMAC signature, not by JWT.
// The raw body parser for this path is mounted in app.ts (before express.json).
router.post('/webhook', webhookLimiter, asyncHandler(paymentWebhook));

// Money endpoints are rate-limited (DoS + abuse) ahead of auth.
router.post(
  '/create-order',
  paymentLimiter,
  auth_middleware,
  asyncHandler(createPaymentOrder)
);
router.post('/verify', paymentLimiter, auth_middleware, asyncHandler(verifyPayment));
router.get('/my-payments', auth_middleware, asyncHandler(myPayments));
router.get(
  '/all',
  auth_middleware,
  requireRole('Admin'),
  asyncHandler(allPayments)
);
router.post(
  '/cleanup',
  auth_middleware,
  requireRole('Admin'),
  asyncHandler(cleanupPayments)
);

export default router;
