'use client';

// Editor-only slide-over to tune the front-page sections (F12): ORDER (up/down), VISIBILITY (show
// toggle), band SIZE (stories shown, 1–7) and prominence WEIGHT. All of it is persisted in the ranking
// weights config (/api/studio/weights → rigwire.ranking_weights: topic_weights + section_layout) and
// re-applied by the reader ranking on every build, so a saved order survives reload and IS the
// front-page order. Weights are admin-only (F8: the route enforces it, and /curate only mounts this
// panel for admins).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/studio/ui';
import {
  DEFAULT_SECTION_LAYOUT,
  resolveSectionLayout,
  SECTION_COUNT_MAX,
  SECTION_COUNT_MIN,
  type SectionSetting,
} from '@/lib/worldwide/sections';

/** Move the item at `from` by `delta` places — returns a new array. */
function moved<T>(xs: ReadonlyArray<T>, from: number, delta: number): T[] {
  const to = from + delta;
  if (to < 0 || to >= xs.length) return [...xs];
  const next = [...xs];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface SectionManagerProps {
  open: boolean;
  onClose: () => void;
}

interface WeightsResponse {
  ok: boolean;
  data: { topicWeights: Record<string, number>; sectionLayout?: unknown } | null;
  error: { message?: string } | null;
}

export default function SectionManager({ open, onClose }: SectionManagerProps) {
  const toast = useToast();
  const router = useRouter();

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [layout, setLayout] = useState<SectionSetting[]>([...DEFAULT_SECTION_LAYOUT]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    fetch('/api/studio/weights')
      .then((r) => r.json() as Promise<WeightsResponse>)
      .then((json) => {
        if (!active) return;
        if (json.ok && json.data) {
          setWeights({ ...json.data.topicWeights });
          setLayout([...resolveSectionLayout(json.data.sectionLayout)]);
        }
        else toast.show(`Couldn't load weights — ${json.error?.message ?? 'unknown error'}`, 'error');
      })
      .catch((e: unknown) => {
        if (active) toast.show(e instanceof Error ? e.message : 'Couldn’t load weights', 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, toast]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/studio/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicWeights: weights, sectionLayout: layout }),
      });
      const json = (await res.json().catch(() => null)) as WeightsResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        toast.show(`Couldn't save weights — ${json?.error?.message ?? `HTTP ${res.status}`}`, 'error');
        return;
      }
      toast.show('Sections saved — the front page uses this order now');
      router.refresh(); // re-render the live preview below with the saved layout
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close section manager"
          onClick={onClose}
          className="fixed inset-0 z-[70] bg-studio-ink/20"
        />
      )}
      <aside
        aria-hidden={!open}
        className={[
          'fixed right-0 top-0 z-[80] flex h-full w-[380px] max-w-full flex-col border-l border-studio-rule bg-studio-paper transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-studio-rule px-4 py-3">
          <h2 className="font-display text-studio-ink">Sections</h2>
          <button type="button" onClick={onClose} className="font-mono text-ui-sm text-studio-muted">
            Close ✕
          </button>
        </header>

        <p className="border-b border-studio-rule px-4 py-2 font-sans text-ui-sm text-studio-muted">
          Order, visibility, how many stories each band shows, and each section&rsquo;s{' '}
          <b className="text-studio-ink">weight</b> are saved and applied to the reader front page.
        </p>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="font-sans text-ui-sm text-studio-muted">Loading weights…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {layout.map((setting, i) => {
                const update = (patch: Partial<SectionSetting>) =>
                  setLayout((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div
                    key={setting.topic}
                    className="flex flex-col gap-1 border border-studio-rule bg-studio-paper px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 font-mono text-ui-sm text-studio-muted">{i + 1}</span>
                      <span
                        className={[
                          'flex-1 font-mono text-ui-sm uppercase tracking-wider',
                          setting.visible ? 'text-studio-ink' : 'text-studio-muted line-through',
                        ].join(' ')}
                      >
                        {setting.topic}
                      </span>
                      <button
                        type="button"
                        aria-label={`Move ${setting.topic} up`}
                        disabled={i === 0}
                        onClick={() => setLayout((prev) => moved(prev, i, -1))}
                        className="px-1 font-mono text-ui-sm text-studio-ink disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${setting.topic} down`}
                        disabled={i === layout.length - 1}
                        onClick={() => setLayout((prev) => moved(prev, i, 1))}
                        className="px-1 font-mono text-ui-sm text-studio-ink disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex items-center gap-3 pl-7 font-mono text-ui-sm text-studio-muted">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={setting.visible}
                          onChange={(e) => update({ visible: e.target.checked })}
                        />
                        show
                      </label>
                      <label className="flex items-center gap-1">
                        stories
                        <input
                          type="number"
                          min={SECTION_COUNT_MIN}
                          max={SECTION_COUNT_MAX}
                          step="1"
                          value={setting.count}
                          onChange={(e) => {
                            const n = Math.round(Number(e.target.value));
                            if (Number.isFinite(n)) {
                              update({ count: Math.min(SECTION_COUNT_MAX, Math.max(SECTION_COUNT_MIN, n)) });
                            }
                          }}
                          className="w-12 border border-studio-rule bg-studio-paper px-1 py-0.5 text-right text-studio-ink outline-none"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        weight
                        <input
                          type="number"
                          step="0.1"
                          value={weights[setting.topic] ?? 1}
                          onChange={(e) =>
                            setWeights((prev) => ({ ...prev, [setting.topic]: Number(e.target.value) }))
                          }
                          className="w-14 border border-studio-rule bg-studio-paper px-1 py-0.5 text-right text-studio-ink outline-none"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-studio-rule px-4 py-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="w-full border border-studio-rule bg-studio-paper px-3 py-2 font-sans text-ui-sm font-semibold text-studio-ink disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save sections'}
          </button>
        </footer>
      </aside>
    </>
  );
}
