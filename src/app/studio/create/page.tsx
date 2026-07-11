// Editorial CMS — Create a manual story (E6).
import { CmsCard, CmsCardGrid } from '@/components/studio/cms-card';
import { listManualStories } from '@/lib/studio/manual';
import { countryName } from '@/lib/worldwide/country';

import { CreateClient } from './create-client';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const recent = await listManualStories(30);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>
        Create a story
      </h1>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 20 }}>
        Author a manual story — it bypasses the generator and is injected into the feed alongside the
        machine&rsquo;s output. Headline and body are required; everything else is optional.
      </p>

      <CreateClient />

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
