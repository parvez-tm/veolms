import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
  isPaymentConfigured,
  isWebhookConfigured,
} from '../src/services/payment-service';
import { env } from '../src/config/env';

const KEY_SECRET = env.razorpay.keySecret;
const WEBHOOK_SECRET = env.razorpay.webhookSecret;

function paymentSig(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

describe('payment-service signature verification', () => {
  it('reports configured from env', () => {
    expect(isPaymentConfigured()).toBe(true);
    expect(isWebhookConfigured()).toBe(true);
  });

  it('accepts a correct checkout signature', () => {
    const sig = paymentSig('order_123', 'pay_456');
    expect(verifyPaymentSignature('order_123', 'pay_456', sig)).toBe(true);
  });

  it('rejects a tampered payment id', () => {
    const sig = paymentSig('order_123', 'pay_456');
    expect(verifyPaymentSignature('order_123', 'pay_EVIL', sig)).toBe(false);
  });

  it('rejects a tampered order id', () => {
    const sig = paymentSig('order_123', 'pay_456');
    expect(verifyPaymentSignature('order_EVIL', 'pay_456', sig)).toBe(false);
  });

  it('rejects a forged signature', () => {
    expect(verifyPaymentSignature('order_123', 'pay_456', 'deadbeef')).toBe(false);
  });

  it('rejects empty/missing fields', () => {
    expect(verifyPaymentSignature('', 'pay_456', 'x')).toBe(false);
    expect(verifyPaymentSignature('order_123', '', 'x')).toBe(false);
    expect(verifyPaymentSignature('order_123', 'pay_456', '')).toBe(false);
  });

  it('verifies a webhook signature over the RAW body bytes', () => {
    const raw = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    expect(verifyWebhookSignature(raw, sig)).toBe(true);
    // Re-serialized (different bytes) or wrong signature must fail.
    expect(verifyWebhookSignature(Buffer.from('{}'), sig)).toBe(false);
    expect(verifyWebhookSignature(raw, undefined)).toBe(false);
  });
});
