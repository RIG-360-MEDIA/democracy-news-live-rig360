'use server';

import { consumeResetToken } from '@/lib/auth/reset-tokens';

export type ResetState = { ok: true; email: string } | { ok: false; error: string } | null;

export async function resetPasswordAction(_prev: ResetState, form: FormData): Promise<ResetState> {
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password !== confirm) return { ok: false, error: 'The two passwords don’t match.' };
  const res = await consumeResetToken(token, password);
  if (!res.ok) return res;
  console.info('[reset-password] password set');
  return { ok: true, email: res.email };
}
