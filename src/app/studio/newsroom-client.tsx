'use client';

// RigWire Studio — Newsroom client. Three lanes behind a SegmentedToggle:
//   NEXT UP — wire clusters in publish order; top 3 carry a red QueueNumeral + projected slot.
//   LIVE    — on the site, grouped by section; thin red edge on the top-10.
//   HELD    — machine-held / editor-hidden, with who/when/why.
// Every mutating action goes through /api/studio/override; the publish toast reports the placement
// the route now returns. Reads only Studio primitives + Studio tokens (reader site untouched).

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';

import { useRouter } from 'next/navigation';

import {
  QueueNumeral,
  SegmentedToggle,
  StatusChip,
  StoryRowCard,
  ToastProvider,
  useToast,
} from '@/components/studio/ui';
import { BUFFER_MINUTES, bufferMsRemaining, isPastBuffer } from '@/lib/publish-buffer';
import type { LiveMeta } from '@/lib/studio/live-meta';
import type { Placement } from '@/lib/studio/placement';
import type { QueueItem } from '@/lib/studio/queue';
import { fmtStamp } from '@/lib/studio/time';
import type { DeskStory } from '@/lib/studio/types';
import { countryName } from '@/lib/worldwide/country';

type LaneKey = 'next' | 'live' | 'held';

// LIVE lane grouping order; a live story with no dedicated section falls into the trailing bucket.
const SECTION_ORDER = [
  'POLITICS', 'SECURITY', 'BUSINESS', 'FINANCE', 'TECHNOLOGY',
  'HEALTH', 'ENVIRONMENT', 'LEGAL', 'SPORTS', 'SOCIETY',
] as const;
const NO_SECTION = 'OTHER';

const LIVE_EDGE_TOP_N = 10; // thin red left edge on the N most important live stories

function sectionTitle(token: string): string {
  return token.charAt(0) + token.slice(1).toLowerCase();
}

function humanizeDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

const place = (map: Record<string, Placement | null>, id: string): Placement | null =>
  map[id] ?? null;

interface OverrideResponse {
  ok: boolean;
  data: ({ placement?: Placement | null } & Record<string, unknown>) | null;
  error: { message: string } | null;
}

interface GenerateResponse {
  ok: boolean;
  data: { job_id?: string | null } | null;
  error: { message: string } | null;
}

export interface NewsroomClientProps {
  stories: DeskStory[];
  queue: QueueItem[];
  placements: Record<string, Placement | null>;
  meta: Record<string, LiveMeta>;
}

export function NewsroomClient(props: NewsroomClientProps) {
  return (
    <ToastProvider>
      <Newsroom {...props} />
    </ToastProvider>
  );
}

function Newsroom({ stories, queue, placements, meta }: NewsroomClientProps) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [lane, setLane] = useState<LaneKey>('next');

  // ── Lane partitions ──────────────────────────────────────────────
  const nextUp = useMemo(
    () => [...queue].sort((a, b) => b.importance - a.importance),
    [queue],
  );

  const live = useMemo(
    () => stories.filter((s) => s.state === 'live' || s.state === 'top'),
    [stories],
  );

  const held = useMemo(
    () => stories.filter((s) => s.state === 'held' || s.state === 'hidden'),
    [stories],
  );

  // The N most important live stories get the accent edge.
  const edgeIds = useMemo(() => {
    const top = [...live].sort((a, b) => b.effectiveImportance - a.effectiveImportance);
    return new Set(top.slice(0, LIVE_EDGE_TOP_N).map((s) => s.storyId));
  }, [live]);

  // Live stories grouped by projected section, each group ordered by current position.
  const liveGroups = useMemo(() => {
    const groups = new Map<string, DeskStory[]>();
    for (const s of live) {
      const section = place(placements, s.storyId)?.section ?? NO_SECTION;
      groups.set(section, [...(groups.get(section) ?? []), s]);
    }
    const order = [...SECTION_ORDER, NO_SECTION];
    return order
      .filter((sec) => groups.has(sec))
      .map((sec) => ({
        section: sec,
        stories: [...(groups.get(sec) ?? [])].sort(
          (a, b) =>
            (place(placements, a.storyId)?.position ?? Infinity) -
            (place(placements, b.storyId)?.position ?? Infinity),
        ),
      }));
  }, [live, placements]);

  // ── Actions ──────────────────────────────────────────────────────
  async function act(
    storyId: string,
    kind: string,
    extra: Record<string, unknown> = {},
    okMsg?: string,
  ): Promise<OverrideResponse | null> {
    setBusy(storyId + kind);
    try {
      const r = await fetch('/api/studio/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, kind, ...extra }),
      });
      const j = (await r.json().catch(() => null)) as OverrideResponse | null;
      if (!r.ok || !j?.ok) {
        show(`Couldn't do that: ${j?.error?.message ?? r.status}`, 'error');
        return null;
      }
      if (okMsg) show(okMsg);
      start(() => router.refresh());
      return j;
    } catch {
      show('Network error — nothing changed.', 'error');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function publish(storyId: string): Promise<void> {
    const j = await act(storyId, 'publish');
    if (!j) return;
    const p = j.data?.placement ?? null;
    show(p ? `Live — #${p.position} in ${sectionTitle(p.section)}` : 'Live on the site.');
  }

  // Publish now = skip the 15-min hold-and-release buffer. Same override as Publish (force-surface),
  // but the toast names the bypass so the editor knows the window was cut short.
  async function publishNow(storyId: string): Promise<void> {
    const j = await act(storyId, 'publish');
    if (!j) return;
    show('Live now — bypassed the 15-min window');
  }

  // Generate = ask the box to write a pending-gen cluster's story now, then route to Door B review.
  // The generation service isn't deployed yet, so a 503 is expected and reported honestly.
  async function generate(storyId: string): Promise<void> {
    setBusy(storyId + 'generate');
    try {
      const r = await fetch('/api/studio/generate-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });
      const j = (await r.json().catch(() => null)) as GenerateResponse | null;
      if (r.status === 503) {
        show(j?.error?.message ?? 'Generation service not deployed yet', 'error');
        return;
      }
      if (!r.ok || !j?.ok) {
        show(`Couldn't start generation: ${j?.error?.message ?? r.status}`, 'error');
        return;
      }
      show('Generating… will appear in review shortly');
      const jobId = j.data?.job_id;
      if (jobId) router.push(`/studio/draft/${jobId}`);
      else start(() => router.refresh());
    } catch {
      show('Network error — generation not started.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  const options = [
    { key: 'next' as const, label: 'Next up', count: nextUp.length },
    { key: 'live' as const, label: 'Live', count: live.length },
    { key: 'held' as const, label: 'Held', count: held.length },
  ];

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="font-display text-d-sm font-semibold text-studio-ink">Newsroom</h1>
        <SegmentedToggle<LaneKey>
          options={options}
          value={lane}
          onChange={setLane}
          ariaLabel="Newsroom lanes"
        />
      </div>

      <div className={pending ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {lane === 'next' && (
          <NextUpLane
            rows={nextUp}
            placements={placements}
            busy={isBusy}
            onPublish={publish}
            onPublishNow={publishNow}
            onGenerate={generate}
            act={act}
            show={show}
          />
        )}
        {lane === 'live' && (
          <LiveLane groups={liveGroups} placements={placements} meta={meta} edgeIds={edgeIds} busy={isBusy} act={act} show={show} />
        )}
        {lane === 'held' && (
          <HeldLane rows={held} meta={meta} busy={isBusy} onPublish={publish} act={act} show={show} />
        )}
      </div>
    </div>
  );
}

// ── Shared action controls ──────────────────────────────────────────

type Act = (id: string, kind: string, extra?: Record<string, unknown>, okMsg?: string) => Promise<OverrideResponse | null>;
type Show = (message: string, tone?: 'info' | 'error') => void;

const BTN = 'inline-flex items-center border px-2.5 py-1 font-mono text-ui-sm uppercase tracking-wider transition-colors disabled:opacity-40';
const MENU_ITEM = 'px-3 py-1.5 text-left font-sans text-ui-md text-studio-ink hover:bg-studio-rule';

function PublishBtn({ id, busy, onPublish }: { id: string; busy: boolean; onPublish: (id: string) => void }) {
  return (
    <button type="button" disabled={busy} onClick={() => onPublish(id)} title="Put this on the site now" className={`${BTN} border-studio-ink bg-studio-ink text-studio-paper hover:opacity-90`}>
      Publish
    </button>
  );
}

function HoldBtn({ id, busy, act, show }: { id: string; busy: boolean; act: Act; show: Show }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => { const j = await act(id, 'unpublish'); if (j) show('Held — off the site.'); }}
      title="Take this off the site"
      className={`${BTN} border-studio-accent text-studio-accent hover:bg-studio-accent hover:text-studio-paper`}
    >
      Hold
    </button>
  );
}

function EditLink({ id }: { id: string }) {
  return (
    <a href={`/studio/story/${id}`} title="Edit headline, text, section" className={`${BTN} border-studio-rule text-studio-muted hover:text-studio-ink no-underline`}>
      Edit
    </a>
  );
}

// Publish now — skip the 15-min buffer and go live immediately (force-surface override).
function PublishNowBtn({ id, busy, onPublishNow }: { id: string; busy: boolean; onPublishNow: (id: string) => void }) {
  return (
    <button type="button" disabled={busy} onClick={() => onPublishNow(id)} title="Skip the 15-minute buffer and go live now" className={`${BTN} border-studio-ink bg-studio-ink text-studio-paper hover:opacity-90`}>
      Publish now
    </button>
  );
}

// Generate — ask the box to write a pending-gen cluster now. Guards against a double-fire while the
// request is in flight (a second click can't queue a duplicate job).
function GenerateBtn({ id, busy, onGenerate }: { id: string; busy: boolean; onGenerate: (id: string) => Promise<void> }) {
  const [firing, setFiring] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || firing}
      onClick={async () => {
        if (firing) return;
        setFiring(true);
        try { await onGenerate(id); } finally { setFiring(false); }
      }}
      title="Ask the box to write this cluster's story now"
      className={`${BTN} border-studio-ink text-studio-ink hover:bg-studio-ink hover:text-studio-paper`}
    >
      Generate
    </button>
  );
}

// Live, client-side countdown to a scheduled story's auto-release (generatedAt + BUFFER_MINUTES).
// NOTE: reader appearance also depends on the 600s reader Data Cache (src/lib/cache.ts). Publish-now
// revalidates that tag so it shows at once; a NATURAL release is not a write, so it can lag up to the
// cache TTL after this countdown hits zero. No fix needed — the buffer is the deliberate delay.
function Countdown({ generatedAt }: { generatedAt: string }) {
  const [remaining, setRemaining] = useState(() => bufferMsRemaining(generatedAt));
  useEffect(() => {
    setRemaining(bufferMsRemaining(generatedAt));
    const t = setInterval(() => setRemaining(bufferMsRemaining(generatedAt)), 1000);
    return () => clearInterval(t);
  }, [generatedAt]);
  if (remaining <= 0) {
    return <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">releasing…</span>;
  }
  const total = Math.round(remaining / 1000);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');
  return (
    <span
      className="font-mono text-ui-sm uppercase tracking-wider text-studio-accent"
      title={`Auto-releases ${BUFFER_MINUTES} minutes after generation`}
    >
      goes live in {mm}:{ss}
    </span>
  );
}

function Menu({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" title={title} onClick={() => setOpen((o) => !o)} className={`${BTN} border-studio-rule text-studio-muted hover:text-studio-ink`}>
        {label}
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 flex min-w-[11rem] flex-col border border-studio-rule bg-studio-paper py-1 shadow-sm"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Section override has no API kind yet (the override route stays publish/unpublish/kill/pin/boost).
// Rendered so the desk shows the control; selecting a section flags that the wiring is pending
// rather than firing a request that would 400. See the handoff note.
function SectionMenu({ show }: { show: Show }) {
  return (
    <Menu label="Section ▾" title="Move to another section">
      {SECTION_ORDER.map((sec) => (
        <button
          key={sec}
          type="button"
          className={MENU_ITEM}
          onClick={() => show("Section override isn't wired yet — needs a 'section' kind on /api/studio/override.")}
        >
          {sectionTitle(sec)}
        </button>
      ))}
    </Menu>
  );
}

function OverflowMenu({ id, busy, act, show }: { id: string; busy: boolean; act: Act; show: Show }) {
  return (
    <Menu label="···" title="More actions">
      <button
        type="button"
        disabled={busy}
        className={MENU_ITEM}
        onClick={async () => { const j = await act(id, 'pin', { rank: 1 }); if (j) show('Pinned — now the top story.'); }}
      >
        Make top story
      </button>
      <button
        type="button"
        disabled={busy}
        className={`${MENU_ITEM} text-studio-accent`}
        onClick={async () => { const j = await act(id, 'kill'); if (j) show('Removed — hidden from readers.'); }}
      >
        Remove (hide)
      </button>
    </Menu>
  );
}

// ── Lanes ───────────────────────────────────────────────────────────

interface LaneShared {
  placements?: Record<string, Placement | null>;
  meta?: Record<string, LiveMeta>;
  busy: boolean;
  act: Act;
  show: Show;
}

function NextUpLane({
  rows,
  placements,
  busy,
  onPublish,
  onPublishNow,
  onGenerate,
  act,
  show,
}: {
  rows: QueueItem[];
  onPublish: (id: string) => void;
  onPublishNow: (id: string) => void;
  onGenerate: (id: string) => Promise<void>;
} & LaneShared) {
  if (rows.length === 0) return <Empty>Nothing waiting — the wire is clear.</Empty>;
  const map = placements ?? {};
  return (
    <section>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Clustered and ready, in the order they would publish. New machine stories wait{' '}
        {BUFFER_MINUTES} minutes here — with a live countdown — before they auto-release to readers;
        Hold to stop one, or Publish now to skip the wait. Pending-gen clusters can be sent to the box
        with Generate.
      </p>
      <div>
        {rows.map((q, i) => {
          const p = place(map, q.storyId);
          const slot = p ? `${sectionTitle(p.section)} #${p.position}` : 'no section';
          // Scheduled = a generated, publishable story still inside the hold-and-release buffer.
          const genAt = q.generatedAt;
          const scheduled = q.generated && genAt !== null && !isPastBuffer(genAt);
          const meta = (
            <>
              {q.topic} · {countryName(q.country) || q.country} · gen{' '}
              {fmtStamp(genAt ?? q.lastSeen)} · {slot} · {q.sources} src · imp{' '}
              {q.importance.toFixed(1)}
            </>
          );
          return (
            <div key={q.storyId} className="flex items-start gap-4">
              {i < 3 && (
                <div className="flex w-16 shrink-0 flex-col items-center pt-4">
                  <QueueNumeral value={i + 1} />
                  {p && (
                    <span className="mt-1 text-center font-mono text-ui-sm uppercase tracking-wider text-studio-accent">
                      → {slot}
                    </span>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <StoryRowCard
                  headline={q.title}
                  thumbnail={q.image}
                  meta={meta}
                  href={`/studio/story/${q.storyId}`}
                >
                  {scheduled ? (
                    <>
                      <StatusChip state="queued" label="Scheduled" />
                      <Countdown generatedAt={genAt ?? q.lastSeen} />
                      <HoldBtn id={q.storyId} busy={busy} act={act} show={show} />
                      <EditLink id={q.storyId} />
                      <PublishNowBtn id={q.storyId} busy={busy} onPublishNow={onPublishNow} />
                    </>
                  ) : (
                    <>
                      <StatusChip state={q.generated ? 'ready' : 'queued'} label={q.generated ? 'Ready' : 'Pending gen'} />
                      {!q.generated && <GenerateBtn id={q.storyId} busy={busy} onGenerate={onGenerate} />}
                      <PublishBtn id={q.storyId} busy={busy} onPublish={onPublish} />
                      <EditLink id={q.storyId} />
                      <SectionMenu show={show} />
                      <OverflowMenu id={q.storyId} busy={busy} act={act} show={show} />
                    </>
                  )}
                </StoryRowCard>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LiveLane({
  groups,
  placements,
  meta,
  edgeIds,
  busy,
  act,
  show,
}: {
  groups: { section: string; stories: DeskStory[] }[];
  edgeIds: Set<string>;
} & LaneShared) {
  if (groups.length === 0) return <Empty>Nothing live yet — publish from Next up.</Empty>;
  const map = placements ?? {};
  const metaMap = meta ?? {};
  return (
    <section className="flex flex-col gap-8">
      {groups.map((g) => (
        <div key={g.section}>
          <h2 className="mb-2 border-b border-studio-rule pb-1 font-mono text-ui-sm uppercase tracking-[0.18em] text-studio-muted">
            {sectionTitle(g.section)}
            <span className="ml-2 text-studio-ink">{g.stories.length}</span>
          </h2>
          {g.stories.map((s) => {
            const m = metaMap[s.storyId];
            const p = place(map, s.storyId);
            const who = m?.publishedBy ?? m?.editedBy ?? 'machine';
            const rowMeta = (
              <>
                gen {fmtStamp(s.updatedAt)} · pub {fmtStamp(m?.liveSince ?? s.updatedAt)} ·{' '}
                {humanizeDuration(m?.timeOnSiteSeconds ?? null)} on site ·{' '}
                {p ? `${sectionTitle(p.section)} #${p.position}` : '—'} · {who}
                {m?.editedBy ? ` · edited ${m.editedBy}` : ''}
              </>
            );
            const edged = edgeIds.has(s.storyId);
            return (
              <div key={s.storyId} className={edged ? 'border-l-2 border-studio-accent pl-3' : 'pl-3'}>
                <StoryRowCard
                  headline={s.headline}
                  thumbnail={s.image}
                  dek={s.dek}
                  meta={rowMeta}
                  href={`/studio/story/${s.storyId}`}
                >
                  <StatusChip state={s.state === 'top' ? 'published' : 'live'} label={s.state === 'top' ? 'Top' : 'Live'} />
                  <HoldBtn id={s.storyId} busy={busy} act={act} show={show} />
                  <EditLink id={s.storyId} />
                  <SectionMenu show={show} />
                  <OverflowMenu id={s.storyId} busy={busy} act={act} show={show} />
                </StoryRowCard>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function HeldLane({
  rows,
  meta,
  busy,
  onPublish,
  act,
  show,
}: { rows: DeskStory[]; onPublish: (id: string) => void } & LaneShared) {
  if (rows.length === 0) return <Empty>Nothing held.</Empty>;
  const metaMap = meta ?? {};
  return (
    <section>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Held back from readers — machine holds and anything you have hidden. Publish to override.
      </p>
      {rows.map((s) => {
        const m = metaMap[s.storyId];
        const by = m?.editorId ?? 'machine';
        const rowMeta = (
          <>
            held {fmtStamp(m?.updatedAt ?? s.updatedAt)} · {by}
            {s.reason ? ` · ${s.reason}` : ''}
          </>
        );
        return (
          <StoryRowCard
            key={s.storyId}
            headline={s.headline}
            thumbnail={s.image}
            dek={s.dek}
            meta={rowMeta}
            href={`/studio/story/${s.storyId}`}
            dimmed={s.state === 'hidden'}
          >
            <StatusChip state="held" label={s.state === 'hidden' ? 'Hidden' : 'Held'} />
            <PublishBtn id={s.storyId} busy={busy} onPublish={onPublish} />
            <EditLink id={s.storyId} />
            <OverflowMenu id={s.storyId} busy={busy} act={act} show={show} />
          </StoryRowCard>
        );
      })}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-16 text-center font-sans text-ui-md text-studio-muted">{children}</p>;
}
