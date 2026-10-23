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

  const recent = await listManualStories(30);
  const authorsOf = await getAuthorsMap(recent.map((s) => s.id));   // bylines (empty map before migration 011)
  // ?draft=<id>: reopen a saved draft in the form (only a DRAFT - a live story is edited from its card).
  const { draft: draftParam } = await searchParams;
  const d = recent.find((s) => s.id === draftParam && s.status === 'DRAFT');
  const draft = d ? { id: d.id, headline: d.headline, dek: d.dek ?? '', authors: authorsOf.get(d.id) ?? '', body: d.body, topic: d.topic, country: d.country ?? '',
                      image_url: d.imageUrl ?? '', importance: String(d.importance) } : null;

  // Door B (AI topic drafts) is shown only when a real box is configured — or in dev, where mock mode
  // is fine for testing. In production without BOX_STUDIO_URL the dispatch client is in mock mode, so
  // exposing "From a topic" would let editors gather/publish fixture drafts as if they were real.
  const doorBEnabled = isDispatchLive() || process.env.NODE_ENV !== 'production';

  let jobs: JobStatus[] = [];
  if (doorBEnabled) {
    try {
      jobs = await listJobs(undefined, editor.id);
    } catch {
      // The draft desk is optional context here — a box/mock hiccup must not 500
      // the whole Create page. Fall back to an empty tray.
      jobs = [];
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>
        Create a story
      </h1>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 20 }}>
        {doorBEnabled
          ? 'Author a manual story, or hand the machine a topic brief and let it gather and draft. Manual stories bypass the generator; topic drafts land in My Drafts below and go to review once ready.'
          : 'Author a story by hand. (AI topic drafts are unavailable until the generation service is configured.)'}
      </p>

      <CreateClient initialJobs={jobs} doorBEnabled={doorBEnabled} draft={draft} />

      <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, fontWeight: 600, margin: '30px 0 10px' }}>
        Recently created
      </h2>
      <CmsCardGrid>
        {recent.map((s) => (
          <CmsCard
            key={s.id}
            href={s.status === 'DRAFT' ? `/studio/create?draft=${s.id}` : `/long-read/${s.id}`}
            image={s.imageUrl}
            kicker={`${s.topic} · ${countryName(s.country) || s.country || 'XX'} · imp ${s.importance}`}
            headline={s.headline}
            badge={s.status === 'DRAFT' ? { label: 'DRAFT', bg: '#fff4d6', fg: '#8a6d1a' } : { label: 'MANUAL', bg: '#e6f0ff', fg: '#1b4b91' }}
            dim={!s.status.startsWith('PUBLISHABLE')}
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
                  status={s.status}
                  canDelete={editor.isAdmin}
                  promptFlag={worstLeak(s.headline, s.dek)}
                />
              </div>
            }
          />
        ))}
      </CmsCardGrid>
      {recent.length === 0 && (
        <p style={{ color: '#999', padding: 40, textAlign: 'center', fontSize: 13 }}>No manual stories yet.</p>
      )}
    </div>
  );
}
