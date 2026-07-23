// Editorial CMS — Create a story (E6): manual authoring (Door A) plus AI-assisted
// topic briefs (Door B), with the editor's recent manual stories beneath.
import { redirect } from 'next/navigation';

import { CmsCard, CmsCardGrid } from '@/components/studio/cms-card';
import { listJobs } from '@/lib/dispatch/client';
import { listManualStories } from '@/lib/studio/manual';
import { requireEditor } from '@/lib/studio/session';
import { countryName } from '@/lib/worldwide/country';

import CreateClient from './create-client';

import type { JobStatus } from '@/lib/dispatch/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  const recent = await listManualStories(30);

  let jobs: JobStatus[] = [];
  try {
    jobs = await listJobs(undefined, guard.editor.id);
  } catch {
    // The draft desk is optional context here — a box/mock hiccup must not 500
    // the whole Create page. Fall back to an empty tray.
    jobs = [];
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>
        Create a story
      </h1>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 20 }}>
        Author a manual story, or hand the machine a topic brief and let it gather and draft. Manual
        stories bypass the generator; topic drafts land in <em>My Drafts</em> below and go to review
        once ready.
      </p>

      <CreateClient initialJobs={jobs} />

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
            footer={
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: '#999' }}>
                by {s.editorId} · {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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
