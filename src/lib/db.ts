// src/lib/db.ts
//
// Two Postgres clients + an RLS helper.
//
//   sqlAnalytics  →  analytics_user (READ-ONLY).
//                    Substrate + analytics queries that don't need user
//                    identity (worldwide_candidates, pair_scores, etc.).
//
//   sql           →  rigwire_app (READ/WRITE on auth + rigwire).
//                    Authenticated app traffic. Wrap user-scoped queries
//                    in `withUser(userId, cb)` so RLS sees the right
//                    `app.user_id` setting.
//
// Env vars:
//   ANALYTICS_DB_URL=postgresql://analytics_user:PASS@host:5433/rig
//   RIGWIRE_DB_URL=postgresql://rigwire_app:PASS@host:5433/rig

import postgres, { type Sql, type TransactionSql } from 'postgres';

function client(envKey: 'ANALYTICS_DB_URL' | 'RIGWIRE_DB_URL', poolSize = 10): Sql {
  const url = process.env[envKey];
  if (!url) {
    throw new Error(`${envKey} is not set. Check .env.local.`);
  }
  // A transaction-mode pooler (Neon's -pooler endpoint / pgbouncer=true) cannot use prepared
  // statements — disable them there, keep them on a direct/session connection (the box tunnel).
  const pooled = url.includes('pgbouncer=true') || url.includes('-pooler.');
  return postgres(url, {
    prepare: !pooled,
    max: poolSize,
    idle_timeout: 30,
    max_lifetime: 60 * 10, // recycle connections every 10 min so a stale pooled/tunnel socket is never reused
    connect_timeout: 10,
  });
}

export const sqlAnalytics = client('ANALYTICS_DB_URL', 10);
export const sql          = client('RIGWIRE_DB_URL',   20);

/**
 * Run a user-scoped query block with RLS context.
 * Opens a transaction, SETs `app.user_id`, then runs the callback.
 * All queries inside the callback see only the user's own rows
 * (where RLS policies use `auth.uid()`).
 *
 * Example:
 *   const prefs = await withUser(userId, async tx => {
 *     return tx`SELECT * FROM rigwire.user_preferences`;
 *   });
 */
export async function withUser<T>(
  userId: string,
  cb: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.user_id', ${userId}, true)`;
    return cb(tx);
  }) as Promise<T>;
}
