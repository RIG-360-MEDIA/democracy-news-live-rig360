// Editorial CMS — Create a story (E6): manual authoring (Door A) plus AI-assisted
// topic briefs (Door B), with the editor's recent manual stories beneath.

import { CmsCard, CmsCardGrid } from '@/components/studio/cms-card';
import { isDispatchLive, listJobs } from '@/lib/dispatch/client';
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

export default async function Page() {
  const editor = await guardPage('editor');

  const recent = await listManualStories(30);

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

      <CreateClient initialJobs={jobs} doorBEnabled={doorBEnabled} />

      <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, fontWeight: 600, margin: '30px 0 10px' }}>
        Recently created
      </h2>
      <CmsCardGrid>
        {recent.map((s) => (
          <CmsCard
            key={s.id}
            href={`/long-read/${s.id}`}
            image={s.imageUrl}
            kicker={`${s.topic} · ${countryName(s.country) || s.country || 'XX'} · imp ${s.importance}`}
            headline={s.headline}
            badge={{ label: 'MANUAL', bg: '#e6f0ff', fg: '#1b4b91' }}
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
