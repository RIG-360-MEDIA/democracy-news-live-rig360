import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ sql: vi.fn() }));

import { clientIp, isOverLimit, LOGIN_LIMITS } from '@/lib/auth/rate-limit';

describe('login rate limit', () => {
  it('allows attempts below both limits', () => {
    expect(isOverLimit({ email: 0, ip: 0 })).toBe(false);
    expect(isOverLimit({ email: LOGIN_LIMITS.perEmail - 1, ip: LOGIN_LIMITS.perIp - 1 })).toBe(false);
  });

  it('limits at the per-email threshold', () => {
    expect(isOverLimit({ email: LOGIN_LIMITS.perEmail, ip: 0 })).toBe(true);
  });

  it('limits at the per-IP threshold (spraying many emails from one IP)', () => {
    expect(isOverLimit({ email: 0, ip: LOGIN_LIMITS.perIp })).toBe(true);
  });

  it('uses 5 per email and 20 per IP in 15-minute windows', () => {
    expect(LOGIN_LIMITS).toEqual({ windowMinutes: 15, perEmail: 5, perIp: 20 });
  });

  it('takes the first x-forwarded-for hop as the client IP', () => {
    const req = new Request('http://t', { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } });
    expect(clientIp(req)).toBe('203.0.113.9');
    expect(clientIp(new Request('http://t'))).toBe('unknown');
    expect(clientIp(undefined)).toBe('unknown');
  });
});

describe('rate limit fails open', () => {
  it('returns zero counts when the attempts table cannot be read (login must not break)', async () => {
    const db = await import('@/lib/db');
    (db.sql as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('permission denied'));
    const { currentCounts } = await import('@/lib/auth/rate-limit');
    await expect(currentCounts('a@b.co', '1.2.3.4')).resolves.toEqual({ email: 0, ip: 0 });
  });

  it('swallows write failures', async () => {
    const db = await import('@/lib/db');
    (db.sql as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('permission denied'));
    const { recordFailure } = await import('@/lib/auth/rate-limit');
    await expect(recordFailure('a@b.co', '1.2.3.4')).resolves.toBeUndefined();
  });
});
