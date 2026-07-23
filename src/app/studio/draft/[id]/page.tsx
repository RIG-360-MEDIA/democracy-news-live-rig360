// Editorial CMS — Door B draft review page (server). Gates with requireEditor,
// fetches the full bundle via the server-only dispatch client, and 404s when
// the job is absent or has no draft yet. The review UI runs under a
// ToastProvider so its optimistic flows can surface rollbacks.

import { notFound } from 'next/navigation';

import { DispatchError, getJob } from '@/lib/dispatch/client';
import { requireEditor } from '@/lib/studio/session';
import { ToastProvider } from '@/components/studio/ui';

import ReviewClient from './review-client';

import type { DraftBundle } from '@/lib/dispatch/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DraftReviewPage({ params }: PageProps) {
  const guard = await requireEditor();
  if (!guard.ok) notFound();

  const { id } = await params;
  if (!id) notFound();

  let bundle: DraftBundle;
  try {
    bundle = await getJob(id, guard.editor.id);
  } catch (e: unknown) {
    // 404 absent, 409 no-draft-yet — both mean "nothing to review here".
    if (e instanceof DispatchError && (e.status === 404 || e.status === 409)) notFound();
    throw e;
  }

  return (
    <ToastProvider>
      <ReviewClient bundle={bundle} />
    </ToastProvider>
  );
}
