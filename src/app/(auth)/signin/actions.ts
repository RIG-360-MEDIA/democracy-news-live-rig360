// src/app/(auth)/signin/actions.ts
//
// Server action for existing-user signin.
// Auth.js handles password verification via the Credentials provider's
// authorize() callback (see src/lib/auth/config.ts).

'use server';

import { z } from 'zod';
import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

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

  try {
    await signIn('credentials', {
      email:      parsed.data.email.trim().toLowerCase(),
      password:   parsed.data.password,
      redirectTo: '/today',
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
