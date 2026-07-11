// src/lib/auth/roles.ts
//
// Single source of truth for role semantics (epic 002, E7).
//
// The role vocabulary is fixed by the DB CHECK constraint on auth.users.role:
//   reader  — default; can read the public feed, no /studio access.
//   editor  — can operate the editorial console: override, edit, create.
//   admin   — editor + feed-wide configuration (ranking weights) + (future) editor mgmt.
//
// EDGE-SAFE: this file must import nothing Node-only (no DB, no argon2). It is
// imported by the Edge middleware (config.edge.ts) AND by Node server code.
// Keep it a pure, dependency-free set of predicates.

export type Role = 'reader' | 'editor' | 'admin';

/** Roles allowed to operate the editorial console. */
export function isEditor(role: string | null | undefined): boolean {
  return role === 'editor' || role === 'admin';
}

/** Roles allowed to change feed-wide configuration (ranking weights, future editor mgmt). */
export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin';
}
