// STEP 3 — source management. Tag each source's political lean to sharpen the Story-Lens bias view.
// Auth-gated by the studio layout.
import { listSources, unratedSourceCount } from '@/lib/editorial/sources';

import SourcesClient from './sources-client';

export const dynamic = 'force-dynamic';

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [rows, unrated] = await Promise.all([listSources(q ?? ''), unratedSourceCount()]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Sources</h1>
        <p style={{ fontSize: 12.5, color: '#666', margin: '4px 0 0' }}>
          Tag political lean to sharpen the bias view. <b>{unrated}</b> sources still unrated (they fall into the “Unknown” bucket).
        </p>
      </div>

      <form method="get" style={{ display: 'flex', gap: 8 }}>
        <input name="q" defaultValue={q ?? ''} placeholder="Search name or domain…"
          style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #d8d8d6', width: 280 }} />
        <button type="submit" style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#0d0a08', color: '#fff', cursor: 'pointer' }}>Search</button>
      </form>

      <p style={{ fontSize: 11.5, color: '#999', margin: 0 }}>Showing {rows.length} sources · change a lean to save instantly.</p>
      <SourcesClient rows={rows} />
    </div>
  );
}
