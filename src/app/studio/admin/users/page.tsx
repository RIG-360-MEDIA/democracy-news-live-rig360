// Admin — people & access (P07 S07.01.05). DNL is invitation-only: admins create accounts and hand out
// one-time set-password links (no email service — owner default O-7).

import { guardPage } from '@/lib/studio/guard';
import { listUsers } from '@/lib/studio/users';

import { UsersClient, type UserView } from './users-client';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const editor = await guardPage('admin');

  const users: UserView[] = (await listUsers()).map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    created: new Date(u.created_at).toISOString().slice(0, 10),
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-studio-ink">People &amp; access</h1>
      <p className="mt-1 max-w-prose text-ui-md text-studio-muted">
        Sign-up is invitation-only. Create an account, then send the person the one-time link it gives you —
        they choose their own password. Use &ldquo;Password link&rdquo; if someone is locked out.
      </p>
      <UsersClient users={users} me={editor.id} />
    </div>
  );
}
