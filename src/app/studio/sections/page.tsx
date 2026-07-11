// Editorial CMS — Section fill dashboard (E6). Read-only.
// Maps each desk story's generator topic onto one of the 10 sections and
// shows how full each section is against the target of 6 publishable stories.
import { getDeskFeed } from '@/lib/studio/feed';

import type { DeskStory } from '@/lib/studio/types';

export const dynamic = 'force-dynamic';

const TARGET = 6;

// The 10 sections, in display order.
const SECTIONS = [
  'Politics',
  'Sports',
  'Security',
  'Environment',
  'Health',
  'Business',
  'Finance',
  'Legal',
  'Technology',
  'Society',
] as const;

type Section = (typeof SECTIONS)[number];

// Generator emits ~17 topic labels; collapse them onto the 10 sections.
// INTERNATIONAL / OTHER (and anything unmapped) fall into no section.
const TOPIC_TO_SECTION: Record<string, Section> = {
  POLITICS: 'Politics',
  GOVERNANCE: 'Politics',
  SPORTS: 'Sports',
  SECURITY: 'Security',
  ENVIRONMENT: 'Environment',
  AGRICULTURE: 'Environment',
  HEALTH: 'Health',
  BUSINESS: 'Business',
  INFRASTRUCTURE: 'Business',
  FINANCE: 'Finance',
  LEGAL: 'Legal',
  TECHNOLOGY: 'Technology',
  SCIENCE: 'Technology',
  CULTURE: 'Society',
  SOCIETY: 'Society',
};

interface SectionFill {
  section: Section;
  count: number;
}

interface FillReport {
  fills: SectionFill[];
  unsectioned: number;
}

/** Count publishable (non-killed) stories per section from the desk feed. */
function tally(stories: readonly DeskStory[]): FillReport {
  const counts: Record<Section, number> = SECTIONS.reduce(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<Section, number>,
  );

  const unsectioned = stories.reduce((noSection, story) => {
    if (story.action === 'killed') return noSection;
    const section = TOPIC_TO_SECTION[story.topic];
    if (!section) return noSection + 1;
    counts[section] += 1;
    return noSection;
  }, 0);

  return {
    fills: SECTIONS.map((section) => ({ section, count: counts[section] })),
    unsectioned,
  };
}

type FillState = 'full' | 'thin' | 'starving';

function stateOf(count: number): FillState {
  if (count >= TARGET) return 'full';
  if (count >= 3) return 'thin';
  return 'starving';
}

const STATE_STYLE: Record<FillState, { bar: string; fg: string; bg: string; label: string }> = {
  full: { bar: '#2e7d32', fg: '#2e7d32', bg: '#e8f5e9', label: 'FULL' },
  thin: { bar: '#c99a1a', fg: '#8a6d1a', bg: '#fff4d6', label: 'THIN' },
  starving: { bar: '#a8141a', fg: '#a8141a', bg: '#fde2e1', label: 'STARVING' },
};

const headingFont = 'var(--font-fraunces), Georgia, serif';

function SectionRow({ fill }: { fill: SectionFill }) {
  const st = STATE_STYLE[stateOf(fill.count)];
  const pct = Math.min(100, (fill.count / TARGET) * 100);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '132px 1fr 78px',
        gap: 14,
        alignItems: 'center',
        padding: '13px 14px',
        borderBottom: '1px solid #eee',
        background: '#fff',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{fill.section}</span>

      <div style={{ height: 10, borderRadius: 6, background: '#f0f0ef', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: st.bar, borderRadius: 6 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, color: '#888' }}>
          {fill.count}/{TARGET}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '.04em',
            color: st.fg,
            background: st.bg,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {st.label}
        </span>
      </div>
    </div>
  );
}

export default async function Page() {
  const stories = await getDeskFeed();
  const { fills, unsectioned } = tally(stories);

  const fullCount = fills.filter((f) => stateOf(f.count) === 'full').length;
  const starvingCount = fills.filter((f) => stateOf(f.count) === 'starving').length;

  return (
    <div>
      <h1 style={{ fontFamily: headingFont, fontSize: 26, fontWeight: 600 }}>Sections</h1>
      <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
        Publishable fill across the 10 front-page sections. Target is {TARGET} stories each —{' '}
        <span style={{ color: STATE_STYLE.full.fg, fontWeight: 600 }}>{fullCount} full</span>,{' '}
        <span style={{ color: STATE_STYLE.starving.fg, fontWeight: 600 }}>{starvingCount} starving</span>.
      </p>

      <div style={{ marginTop: 18, border: '1px solid #eee', borderRadius: 9, overflow: 'hidden' }}>
        {fills.map((fill) => (
          <SectionRow key={fill.section} fill={fill} />
        ))}
      </div>

      <p style={{ color: '#888', fontSize: 12, marginTop: 14 }}>
        <span style={{ fontFamily: 'var(--font-mono), monospace', color: '#1b4b91', fontWeight: 700 }}>
          {unsectioned}
        </span>{' '}
        publishable {unsectioned === 1 ? 'story' : 'stories'} fell into no section (INTERNATIONAL / OTHER / unmapped).
      </p>
    </div>
  );
}
