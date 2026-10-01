// src/lib/editorial/sources.ts
//
// STEP 3 — source management. Admins set each source's political_lean; that directly sharpens the
// Story-Lens bias view (a source with no lean lands in the "Unknown" bucket). Reads/writes public.sources.
// Lean changes are admin-only (F8) and audited atomically (F7).

import { sql } from '@/lib/db';
import { writeAudit } from '@/lib/studio/audit-log';

export const LEAN_OPTIONS = ['left', 'lean-left', 'center', 'lean-right', 'right', 'state', 'unknown'] as const;

export interface SourceRow {
  id: string;
  name: string;
  domain: string;
  lean: string | null;
  active: boolean;
  country: string | null;
}

export async function listSources(search = '', limit = 300): Promise<SourceRow[]> {
  const s = `%${search.trim()}%`;
  const rows = (search.trim()
    ? await sql`SELECT id, name, domain, political_lean, is_active, country FROM public.sources
        WHERE name ILIKE ${s} OR domain ILIKE ${s} ORDER BY (political_lean IS NULL) DESC, name LIMIT ${limit}`
    : await sql`SELECT id, name, domain, political_lean, is_active, country FROM public.sources
        ORDER BY (political_lean IS NULL) DESC, name LIMIT ${limit}`) as unknown as Array<{
      id: string; name: string; domain: string; political_lean: string | null; is_active: boolean; country: string | null;
    }>;
  return rows.map((r) => ({ id: r.id, name: r.name, domain: r.domain, lean: r.political_lean, active: r.is_active, country: r.country }));
}

/** Count of sources still missing a lean — the size of the bias-view blind spot. */
export async function unratedSourceCount(): Promise<number> {
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM public.sources WHERE political_lean IS NULL`) as unknown as [{ n: number }];
  return n;
}

/** Set (or clear, with null) a source's lean and audit the change in the same transaction.
 *  Throws when the source does not exist, so nothing is audited for a no-op. */
export async function setSourceLean(id: string, lean: string | null, actor: string): Promise<void> {
  await sql.begin(async (tx) => {
    const rows = (await tx`
      SELECT domain, political_lean FROM public.sources WHERE id = ${id}::uuid FOR UPDATE
    `) as unknown as Array<{ domain: string; political_lean: string | null }>;
    const prev = rows[0];
    if (!prev) throw new Error('Source not found');
    await tx`UPDATE public.sources SET political_lean = ${lean} WHERE id = ${id}::uuid`;
    await writeAudit(tx, {
      actor,
      action: 'source_lean',
      target: `source:${id}`,
      before: { domain: prev.domain, lean: prev.political_lean },
      after: { domain: prev.domain, lean },
    });
  });
}
