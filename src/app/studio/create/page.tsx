// Editorial CMS — Create a story (E6): manual authoring (Door A) plus AI-assisted
// topic briefs (Door B), with the editor's recent manual stories beneath.

import { CmsCard, CmsCardGrid } from '@/components/studio/cms-card';
import { isDispatchLive, listJobs } from '@/lib/dispatch/client';
import { getAuthorsMap } from '@/lib/studio/authors';
import { listManualStories } from '@/lib/studio/manual';
import { guardPage } from '@/lib/studio/guard';
import { promptLeakLevel } from '@/lib/studio/prompt-leak';
import { countryName } from '@/lib/worldwide/country';

import CreateClient from './create-client';
import ManualDraftsList from './manual-drafts-list';
import ManualStoryControls from './manual-story-controls';

import type { JobStatus } from '@/lib/dispatch/types';

export const dynamic = 'force-dynamic';

/** The stronger prompt-leak level of headline and dek — surfaced on the card so editors can fix it. */
function worstLeak(headline: string, dek: string | null) {
  const levels = [promptLeakLevel(headline), promptLeakLevel(dek)];
  if (levels.includes('leak')) return 'leak' as const;
  return levels.includes('suspect') ? ('suspect' as const) : ('none' as const);
}

export default async function Page({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const editor = await guardPage('editor');

  const all = await listManualStories(60);
  const authorsOf = await getAuthorsMap(all.map((s) => s.id));     // bylines (empty map before migration 011)
  const drafts = all.filter((s) => s.status === 'DRAFT');          // saved for later: never on the site
  const recent = all.filter((s) => s.status !== 'DRAFT').slice(0, 30);
  const { draft: openDraft } = await searchParams;                 // ?draft=<id> opens that draft's editor

  // Door B (AI topic drafts) only when the real generation box is configured - never its mock fixtures
  // (2026-10-23: their fake "My Drafts" jobs were mistaken for the editor's own saved drafts).
  const doorBEnabled = isDispatchLive();

  let jobs: JobStatus[] = [];
  if (doorBEnabled) {
    try {
      jobs = await listJobs(undefined, editor.id);
    } catch {
      jobs = [];                                                  // optional tray: a box hiccup must not 500 the page
    }
  }

  const card = (s: (typeof all)[number]) => (
    <CmsCard
      key={s.id}
      href={s.status === 'DRAFT' ? `/studio/create?draft=${s.id}` : `/long-read/${s.id}`}
      image={s.imageUrl}
      kicker={`${s.topic} · ${countryName(s.country) || s.country || 'XX'} · imp ${s.importance}`}
      headline={s.headline}
      badge={s.status === 'DRAFT' ? { label: 'DRAFT', bg: '#fff4d6', fg: '#8a6d1a' } : { label: 'MANUAL', bg: '#e6f0ff', fg: '#1b4b91' }}
      dim={s.status !== 'DRAFT' && !s.status.startsWith('PUBLISHABLE')}
      footer={
        <div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: '#999' }}>
            by {s.editorId} · {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
          <ManualStoryControls
            id={s.id}
            headline={s.headline}
            dek={s.dek}
            authors={authorsOf.get(s.id) ?? ''}
            body={s.body}
            topic={s.topic}
            country={s.country}
            imageUrl={s.imageUrl}
            importance={s.importance}
            status={s.status}
            canDelete={editor.isAdmin}
            promptFlag={worstLeak(s.headline, s.dek)}
          />
        </div>
      }
    />
  );

  const h2: React.CSSProperties = { fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, fontWeight: 600, margin: '30px 0 10px' };
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>
        Create a story
      </h1>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 20 }}>
        Write a story by hand, or import a Word / PDF document. Save it as a draft to finish later, or publish it now.
      </p>

      <CreateClient initialJobs={jobs} doorBEnabled={doorBEnabled} />

      <h2 style={h2}>Drafts {drafts.length > 0 && <span style={{ fontSize: 13, color: '#8a6d1a' }}>({drafts.length})</span>}</h2>
      <ManualDraftsList
        openId={openDraft}
        drafts={drafts.map((d) => ({ id: d.id, headline: d.headline, dek: d.dek ?? '', authors: authorsOf.get(d.id) ?? '', body: d.body,
                                     topic: d.topic, country: d.country ?? '', imageUrl: d.imageUrl ?? '', importance: d.importance,
                                     updatedAt: d.updatedAt }))}
      />

      <h2 style={h2}>Recently created</h2>
      <CmsCardGrid>{recent.map(card)}</CmsCardGrid>
      {recent.length === 0 && (
        <p style={{ color: '#999', padding: 40, textAlign: 'center', fontSize: 13 }}>No manual stories yet.</p>
      )}
    </div>
  );
}
