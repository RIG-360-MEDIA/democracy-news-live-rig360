// src/lib/auth/password.ts
//
// Argon2id password hashing.
// Uses @node-rs/argon2 — pure-Rust/Node bindings that work on Windows
// without requiring node-gyp / Visual Studio Build Tools (unlike the
// `argon2` npm package).
//
// Install:  npm install @node-rs/argon2
//
// Parameters: OWASP-recommended defaults for Argon2id (2023).
//   memoryCost: 19 MiB  → balances mobile/server hashing time
//   timeCost:   2       → ~50ms on a modern server
//   parallelism: 1

import { hash, verify } from '@node-rs/argon2';

const PARAMS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, PARAMS);
}

export async function verifyPassword(
  plaintext: string,
  storedHash: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext);
  } catch {
    // Malformed hash, wrong algorithm, etc. — fail closed.
    return false;
  }
}
