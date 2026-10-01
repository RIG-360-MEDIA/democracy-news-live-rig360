'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { LEAN_OPTIONS, setSourceLean } from '@/lib/editorial/sources';
import { requireRole } from '@/lib/studio/session';

// '' clears the lean back to unknown/null; anything else must be a known lean.
const leanInput = z.object({
  id: z.guid(),
  lean: z.union([z.literal(''), z.enum(LEAN_OPTIONS)]),
});

/** Set a source's political lean (admin-only: sources are feed-wide configuration). Audited. */
export async function updateSourceLean(id: string, lean: string): Promise<void> {
  const guard = await requireRole('admin');
  if (!guard.ok) throw new Error(guard.status === 401 ? 'Not authenticated' : 'Admin access required');
  const parsed = leanInput.safeParse({ id, lean });
  if (!parsed.success) throw new Error('Invalid source or lean');
  await setSourceLean(parsed.data.id, parsed.data.lean === '' ? null : parsed.data.lean, guard.editor.id);
  revalidatePath('/studio/sources');
}
