// Login rate limiting (DNL program P07 S07.01 / G3). DB-backed fixed windows in auth.login_attempts,
// because Vercel functions share no memory and there is no Redis on this stack. Failed attempts are
// counted per email and per client IP; while limited, sign-in fails exactly like a wrong password
// (no account-enumeration signal).
import 'server-only';

import { sql } from '@/lib/db';

export const LOGIN_LIMITS = {
  windowMinutes: 15,
  perEmail: 5,
  perIp: 20,
} as const;

export interface AttemptCounts { email: number; ip: number }

/** Pure decision — unit tested. */
export function isOverLimit(c: AttemptCounts, limits = LOGIN_LIMITS): boolean {
  return c.email >= limits.perEmail || c.ip >= limits.perIp;
}

export function clientIp(req?: Request | null): string {
  const xf = req?.headers.get('x-forwarded-for') ?? '';
  const ip = xf.split(',')[0]?.trim() || req?.headers.get('x-real-ip') || 'unknown';
  return ip.slice(0, 64);
}

function windowStart(now = new Date()): Date {
  const ms = LOGIN_LIMITS.windowMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

// Fail OPEN: a rate-limiter problem (DB hiccup, missing grant) must never take login down.
// Errors are logged; the password check still runs.
export async function currentCounts(email: string, ip: string): Promise<AttemptCounts> {
  try {
    return await readCounts(email, ip);
  } catch (err) {
    console.error('[rate-limit] read failed (failing open):', err);
    return { email: 0, ip: 0 };
  }
}

async function readCounts(email: string, ip: string): Promise<AttemptCounts> {
  const ws = windowStart();
  const rows = await sql<{ key: string; count: number }[]>`
    SELECT key, count FROM auth.login_attempts
     WHERE window_start = ${ws} AND key IN (${'email:' + email}, ${'ip:' + ip})
  `;
  const get = (k: string) => rows.find((r) => r.key === k)?.count ?? 0;
  return { email: get('email:' + email), ip: get('ip:' + ip) };
}

export async function recordFailure(email: string, ip: string): Promise<void> {
  try {
    await writeFailure(email, ip);
  } catch (err) {
    console.error('[rate-limit] write failed (ignored):', err);
  }
}

async function writeFailure(email: string, ip: string): Promise<void> {
  const ws = windowStart();
  await sql`
    INSERT INTO auth.login_attempts (key, window_start, count)
    VALUES (${'email:' + email}, ${ws}, 1), (${'ip:' + ip}, ${ws}, 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = auth.login_attempts.count + 1
  `;
  // keep the table tiny
  await sql`DELETE FROM auth.login_attempts WHERE window_start < now() - interval '1 day'`;
}
