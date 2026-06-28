import { describe, it, expect } from 'vitest';
import { issueHlsTicket, verifyHlsTicket } from '../src/services/hls-ticket';

describe('HLS playback tickets', () => {
  it('verifies a ticket bound to its asset', () => {
    const ticket = issueHlsTicket(42, 7);
    expect(verifyHlsTicket(ticket, 42)).toBe(true);
  });

  it('rejects a ticket presented for a different asset', () => {
    const ticket = issueHlsTicket(42, 7);
    expect(verifyHlsTicket(ticket, 99)).toBe(false);
  });

  it('rejects empty / garbage tickets', () => {
    expect(verifyHlsTicket('', 42)).toBe(false);
    expect(verifyHlsTicket('not-a-jwt', 42)).toBe(false);
  });
});
