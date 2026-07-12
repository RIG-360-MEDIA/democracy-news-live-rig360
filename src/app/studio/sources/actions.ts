'use server';

import { revalidatePath } from 'next/cache';

import { setSourceLean } from '@/lib/editorial/sources';
import { requireEditor } from '@/lib/studio/session';

/** Set a source's political lean (editor-gated). '' clears it back to unknown/null. */
export async function updateSourceLean(id: string, lean: string): Promise<void> {
  const guard = await requireEditor();
  if (!guard.ok) throw new Error('unauthorized');
  await setSourceLean(id, lean === '' ? null : lean);
  revalidatePath('/studio/sources');
}
