// Editorial CMS — Postgres errors that mean "someone else changed this first", not "server broke".
//
//   23P01 exclusion_violation   — migration 008's one_pin_per_rank (two pins at one rank)
//   23505 unique_violation      — a concurrent insert of the same key
//   40P01 deadlock_detected     — two concurrent pin/reorder transactions locked rows in opposite order
//   40001 serialization_failure — concurrent update under stricter isolation
// Routes answer these with 409 "conflict — reload and try again" instead of 500.

const CONFLICT_SQLSTATES: ReadonlySet<string> = new Set(['23P01', '23505', '40P01', '40001']);

export function isWriteConflict(e: unknown): boolean {
  if (typeof e !== 'object' || e === null || !('code' in e)) return false;
  const code = (e as { code: unknown }).code;
  return typeof code === 'string' && CONFLICT_SQLSTATES.has(code);
}

export const CONFLICT_MESSAGE = 'Someone else changed this at the same time — reload and try again.';
