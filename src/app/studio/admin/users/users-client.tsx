'use client';

import { useActionState } from 'react';

import { createUserAction, resetLinkAction, setRoleAction, type LinkState } from './actions';

export interface UserView {
  id: string;
  email: string;
  displayName: string | null;
  role: 'reader' | 'editor' | 'admin';
  created: string;
}

function LinkResult({ state }: { state: LinkState }) {
  if (!state) return null;
  if (!state.ok) return <p role="alert" className="mt-2 text-ui-sm text-red-700">{state.error}</p>;
  return (
    <div className="mt-3 border border-studio-rule bg-white p-3">
      <p className="text-ui-sm text-studio-ink">{state.message}</p>
      <input
        readOnly
        value={state.link}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full border border-studio-rule px-2 py-1 font-mono text-ui-sm"
        aria-label="One-time password link"
      />
    </div>
  );
}

function ResetLinkButton({ user }: { user: UserView }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(resetLinkAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="email" value={user.email} />
      <button type="submit" disabled={pending} className="text-ui-sm font-semibold text-studio-accent underline">
        {pending ? 'Generating…' : 'Password link'}
      </button>
      <LinkResult state={state} />
    </form>
  );
}

export function UsersClient({ users, me }: { users: UserView[]; me: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(createUserAction, null);
  return (
    <div className="mt-6 grid gap-10">
      <section aria-labelledby="new-user">
        <h2 id="new-user" className="font-display text-lg font-semibold">Add a person</h2>
        <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="grid text-ui-sm">Email
            <input name="email" type="email" required className="mt-1 border border-studio-rule px-2 py-1" />
          </label>
          <label className="grid text-ui-sm">Name
            <input name="displayName" type="text" maxLength={120} className="mt-1 border border-studio-rule px-2 py-1" />
          </label>
          <label className="grid text-ui-sm">Role
            <select name="role" defaultValue="editor" className="mt-1 border border-studio-rule px-2 py-1">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="reader">Reader</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="bg-studio-ink px-4 py-1.5 text-ui-md font-semibold text-studio-paper">
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <LinkResult state={state} />
      </section>

      <section aria-labelledby="all-users">
        <h2 id="all-users" className="font-display text-lg font-semibold">Accounts ({users.length})</h2>
        <table className="mt-3 w-full border-collapse text-left text-ui-md">
          <thead>
            <tr className="border-b border-studio-rule text-ui-sm text-studio-muted">
              <th className="py-2">Email</th><th>Name</th><th>Role</th><th>Created</th><th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-studio-rule align-top">
                <td className="py-2 font-mono text-ui-sm">{u.email}</td>
                <td>{u.displayName ?? '—'}</td>
                <td>
                  <form action={setRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="email" value={u.email} />
                    <select name="role" defaultValue={u.role} disabled={u.email === me} aria-label={`Role for ${u.email}`}
                      className="border border-studio-rule px-1 py-0.5 text-ui-sm">
                      <option value="reader">reader</option>
                      <option value="editor">editor</option>
                      <option value="admin">admin</option>
                    </select>
                    {u.email !== me ? <button type="submit" className="text-ui-sm underline">Save</button> : <span className="text-ui-sm text-studio-muted">(you)</span>}
                  </form>
                </td>
                <td className="text-ui-sm text-studio-muted">{u.created}</td>
                <td><ResetLinkButton user={u} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
