// Editorial CMS — Section fill dashboard (E6). Read-only; admin-only (F8).
// Maps each desk story's generator topic onto one of the 10 sections (the SAME shared map the reader
// ranking uses — worldwide/sections.ts, F12) and shows how full each section is against the target of
// 6 publishable stories, in the editor-saved front-page order (order/visibility/size are edited in
// /curate → Sections and stored in the ranking weights row).
import { getDeskFeed } from '@/lib/studio/feed';
import { guardPage } from '@/lib/studio/guard';
import { getWeights } from '@/lib/studio/weights';
import { sectionOf, type SectionLayout, type SectionTopic } from '@/lib/worldwide/sections';

import type { DeskStory } from '@/lib/studio/types';

export const dynamic = 'force-dynamic';

const TARGET = 6;

type Section = SectionTopic;

const titleCase = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

interface SectionFill {
  section: Section;
  count: number;
  visible: boolean;
  bandSize: number;
}

interface FillReport {
  fills: SectionFill[];
  unsectioned: number;
}

/** Count publishable (non-killed) stories per section from the desk feed, in the saved layout order. */
function tally(stories: readonly DeskStory[], layout: SectionLayout): FillReport {
  const live = stories.filter((story) => story.action !== 'killed');
  const countOf = (section: Section) => live.filter((story) => sectionOf(story.topic) === section).length;
  return {
    fills: layout.map((s) => ({ section: s.topic, count: countOf(s.topic), visible: s.visible, bandSize: s.count })),
    unsectioned: live.filter((story) => sectionOf(story.topic) === null).length,
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
      <span style={{ fontWeight: 600, fontSize: 14, color: fill.visible ? '#111' : '#aaa' }}>
        {titleCase(fill.section)}
        <span style={{ display: 'block', fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 400, color: '#999' }}>
          {fill.visible ? `shows ${fill.bandSize}` : 'hidden'}
        </span>
      </span>

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
  await guardPage('admin');
  const [stories, weights] = await Promise.all([getDeskFeed(), getWeights()]);
  const { fills, unsectioned } = tally(stories, weights.sectionLayout);

  const fullCount = fills.filter((f) => stateOf(f.count) === 'full').length;
  const starvingCount = fills.filter((f) => stateOf(f.count) === 'starving').length;

  return (
    <div>
      <h1 style={{ fontFamily: headingFont, fontSize: 26, fontWeight: 600 }}>Sections</h1>
      <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
        Publishable fill across the 10 front-page sections, in front-page order. Target is {TARGET} stories each —{' '}
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
