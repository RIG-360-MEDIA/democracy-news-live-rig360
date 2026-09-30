import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ sql: Object.assign(vi.fn(), { begin: vi.fn() }) }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(async () => 'argon2-hash') }));

import { generateToken, hashToken, MIN_PASSWORD_LENGTH, passwordProblem, RESET_TTL_HOURS } from '@/lib/auth/reset-tokens';
import { normaliseEmail, ROLES } from '@/lib/studio/users';

describe('reset tokens', () => {
  it('generates URL-safe, high-entropy, unique tokens', () => {
    const a = generateToken(); const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('stores only a SHA-256 hash (deterministic, 64 hex chars, not the raw token)', () => {
    const t = generateToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toContain(t);
  });

  it('expires links after 72 hours', () => {
    expect(RESET_TTL_HOURS).toBe(72);
  });
});

describe('password policy', () => {
  it('rejects short, trivial or huge passwords', () => {
    expect(passwordProblem('short')).toMatch(/at least/);
    expect(passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH))).toMatch(/too simple/);
    expect(passwordProblem('x'.repeat(201))).toMatch(/too long/);
  });
  it('accepts a reasonable passphrase', () => {
    expect(passwordProblem('correct horse battery')).toBeNull();
  });
});

describe('admin user helpers', () => {
  it('normalises and validates emails', () => {
    expect(normaliseEmail('  Editor@Example.ORG ')).toBe('editor@example.org');
    expect(normaliseEmail('not-an-email')).toBeNull();
    expect(normaliseEmail('a @b.com')).toBeNull();
  });
  it('only knows the three roles', () => {
    expect([...ROLES]).toEqual(['reader', 'editor', 'admin']);
  });
});
