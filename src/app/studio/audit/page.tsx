// Editorial CMS — Audit: append-only ledger of every editorial action (epic 002).
// Server-rendered initial page; the client refetches on filter/undo.

import { ToastProvider } from '@/components/studio/ui';
import { listAudit } from '@/lib/studio/audit';
import { guardPage } from '@/lib/studio/guard';

import { AuditClient } from './audit-client';

export const dynamic = 'force-dynamic';

const INITIAL_LIMIT = 100;

export default async function AuditPage() {
  const editor = await guardPage('editor');

  // M2: editors see the newsroom ledger; admin-scope config rows are admin-only.
  const rows = await listAudit({ limit: INITIAL_LIMIT, offset: 0 }, { isAdmin: editor.isAdmin });

  return (
    <ToastProvider>
      <AuditClient initialRows={rows} limit={INITIAL_LIMIT} />
    </ToastProvider>
  );
}
