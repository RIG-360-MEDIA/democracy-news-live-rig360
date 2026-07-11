// src/app/(auth)/signup/actions.ts
//
// Server action for new-user signup.
// Validates input, hashes password with Argon2id, inserts into
// auth.users, immediately seeds default rigwire.user_preferences row
// (with RLS context set so the WITH CHECK passes), signs the user in.

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sql, withUser } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signIn } from '@/lib/auth';

const SignupSchema = z.object({
  email:        z.string().email().max(254),
  password:     z.string().min(8).max(200),
  displayName:  z.string().trim().min(1).max(100).optional(),
});

export type SignupState =
  | null
  | { ok: true }
  | { ok: false; error: string };

// Signature matches React 19 `useActionState`: (prevState, formData) → newState.
// prevState is ignored; we always recompute from the submitted form.
export async function signupAction(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    email:       formData.get('email'),
    password:    formData.get('password'),
    displayName: formData.get('displayName') || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid email or password (min 8 chars).' };
  }

  const { email, password, displayName } = parsed.data;
  const normalised = email.trim().toLowerCase();

  // Check for existing account.
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM auth.users WHERE LOWER(email) = ${normalised} LIMIT 1
  `;
  if (existing.length > 0) {
    return { ok: false, error: 'An account with that email already exists.' };
  }

  const hash = await hashPassword(password);

  const created = await sql<{ id: string }[]>`
    INSERT INTO auth.users (email, password_hash, display_name)
    VALUES (${normalised}, ${hash}, ${displayName ?? null})
    RETURNING id
  `;
  const userId = created[0].id;

  // Seed default preferences row. RLS WITH CHECK requires app.user_id
  // to match the inserted user_id — withUser() sets that for us.
  await withUser(userId, async (tx) => {
    await tx`
      INSERT INTO rigwire.user_preferences (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `;
  });

  // Sign the user in (creates the JWT cookie).
  await signIn('credentials', {
    email: normalised,
    password,
    redirectTo: '/onboarding',
  });

  // signIn redirects internally, but TS wants a return value.
  return { ok: true };
}
