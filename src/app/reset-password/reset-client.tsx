'use client';

import { useActionState } from 'react';

import { resetPasswordAction, type ResetState } from './actions';

export function ResetClient({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, null);
  if (state?.ok) {
    return (
      <p>
        Password set for <strong>{state.email}</strong>. <a href="/signin">Sign in</a>.
      </p>
    );
  }
  return (
    <form action={action} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
      <input type="hidden" name="token" value={token} />
      <label style={{ display: 'grid', gap: 4 }}>New password (at least 10 characters)
        <input name="password" type="password" minLength={10} required autoComplete="new-password"
          style={{ padding: '8px 10px', border: '1px solid #ccc' }} />
      </label>
      <label style={{ display: 'grid', gap: 4 }}>Confirm password
        <input name="confirm" type="password" minLength={10} required autoComplete="new-password"
          style={{ padding: '8px 10px', border: '1px solid #ccc' }} />
      </label>
      {state && !state.ok ? <p role="alert" style={{ color: '#b00020' }}>{state.error}</p> : null}
      <button type="submit" disabled={pending} style={{ padding: '10px 16px', cursor: 'pointer' }}>
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  );
}
