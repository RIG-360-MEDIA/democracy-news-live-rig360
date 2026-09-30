// One-time set/reset password page (P07 S07.01.04). Reached via a link an admin generated in
// /studio/admin/users. The token is validated only on submit (single use, 72 h).
import type { Metadata } from 'next';

import { BRAND } from '@/lib/brand';

import { ResetClient } from './reset-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `Set your password · ${BRAND.name}`, robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main style={{ maxWidth: 440, margin: '96px auto', padding: '0 16px' }}>
      <p style={{ letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase', opacity: 0.7 }}>{BRAND.name}</p>
      <h1 style={{ fontSize: 26, margin: '8px 0' }}>Set your password</h1>
      {token ? <ResetClient token={token} /> : <p>This link is missing its token. Ask an editor-admin for a new one.</p>}
    </main>
  );
}
