// Editorial CMS — Audit: append-only ledger of every editorial action (epic 002).
// Server-rendered initial page; the client refetches on filter/undo.
import { redirect } from 'next/navigation';

import { ToastProvider } from '@/components/studio/ui';
import { listAudit } from '@/lib/studio/audit';
import { requireEditor } from '@/lib/studio/session';

import { AuditClient } from './audit-client';

export const dynamic = 'force-dynamic';

const INITIAL_LIMIT = 100;

export default async function AuditPage() {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  const rows = await listAudit({ limit: INITIAL_LIMIT, offset: 0 });

  return (
    <ToastProvider>
      <AuditClient initialRows={rows} limit={INITIAL_LIMIT} />
    </ToastProvider>
  );
}
