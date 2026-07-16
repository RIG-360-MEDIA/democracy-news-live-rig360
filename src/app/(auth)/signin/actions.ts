// src/app/(auth)/signin/actions.ts
//
// Server action for existing-user signin.
// Auth.js handles password verification via the Credentials provider's
// authorize() callback (see src/lib/auth/config.ts).

'use server';

import { z } from 'zod';
import { AuthError } from 'next-auth';

import { signIn } from '@/lib/auth';
import { sql } from '@/lib/db';
import { isEditor } from '@/lib/auth/roles';

const SigninSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export type SigninState =
  | null
  | { ok: true }
  | { ok: false; error: string };

// Signature matches React 19 `useActionState`: (prevState, formData) → newState.
export async function signinAction(
  _prevState: SigninState,
  formData: FormData,
): Promise<SigninState> {
  const parsed = SigninSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email and password.' };
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Editors/admins land straight in the newsroom (/studio); everyone else in the
  // reader edition. This only pre-selects the post-login destination — signIn()
  // below still verifies the password, and /studio is itself role-gated, so
  // choosing it here can never grant access a wrong password wouldn't.
  let redirectTo = '/today';
  try {
    const rows = await sql<{ role: string }[]>`
      SELECT role FROM auth.users WHERE LOWER(email) = ${email} LIMIT 1
    `;
    if (isEditor(rows[0]?.role ?? 'reader')) redirectTo = '/studio';
  } catch {
    // role lookup failed — fall back to the reader destination
  }

  try {
    await signIn('credentials', {
      email,
      password:   parsed.data.password,
      redirectTo,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      // Generic message — never reveal "user not found" vs "wrong password"
      // (email-enumeration prevention).
      return { ok: false, error: 'Incorrect email or password.' };
    }
    throw err;   // unexpected — let Next.js handle it
  }
}
