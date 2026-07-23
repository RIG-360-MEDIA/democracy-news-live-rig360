'use client';

// Editor-only slide-over to tune the front-page sections. There is NO sections
// table today: the reader ranking (src/lib/worldwide/ranking.ts) fixes both the
// section ORDER (its SECTION_TOPICS array) and the per-section COUNT (a constant)
// in code. What IS persisted and re-read is topic *prominence* via the ranking
// weights config (/api/studio/weights → getWeights().topicWeights). So this panel
// drives prominence for real, and lets the editor preview an order/count they'd
// want — clearly noted as not-yet-honoured — instead of pretending it all persists.
// Weights are admin-only (the route enforces it); a non-admin editor gets a toast.

import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';

import { useToast } from '@/components/studio/ui';

// Mirrors SECTION_TOPICS in ranking.ts (rule 2 allows duplicating a small list over
// coupling to a read-only reader module). Keep in sync if the reader set changes.
const SECTION_TOPICS = [
  'POLITICS', 'SPORTS', 'SECURITY', 'ENVIRONMENT', 'HEALTH',
  'BUSINESS', 'FINANCE', 'LEGAL', 'TECHNOLOGY', 'SOCIETY',
] as const;

const DEFAULT_COUNT = 6;

interface SectionManagerProps {
  open: boolean;
  onClose: () => void;
}

interface WeightsResponse {
  ok: boolean;
  data: { topicWeights: Record<string, number> } | null;
  error: { message?: string } | null;
}

export default function SectionManager({ open, onClose }: SectionManagerProps) {
  const toast = useToast();

  const [sections, setSections] = useState<string[]>([...SECTION_TOPICS]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
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
        if (json.ok && json.data) setWeights({ ...json.data.topicWeights });
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
        body: JSON.stringify({ topicWeights: weights }),
      });
      const json = (await res.json().catch(() => null)) as WeightsResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        toast.show(`Couldn't save weights — ${json?.error?.message ?? `HTTP ${res.status}`}`, 'error');
        return;
      }
      toast.show('Section prominence saved');
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
          Order and per-section count are a local preview — the reader ranking fixes them in code (no
          sections table yet). The <b className="text-studio-ink">weight</b> below is persisted and
          re-applied at read.
        </p>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="font-sans text-ui-sm text-studio-muted">Loading weights…</p>
          ) : (
            <Reorder.Group axis="y" values={sections} onReorder={setSections} className="flex flex-col gap-2">
              {sections.map((topic) => (
                <Reorder.Item key={topic} value={topic}>
                  <div className="flex items-center gap-3 border border-studio-rule bg-studio-paper px-3 py-2">
                    <span className="cursor-grab select-none font-mono text-ui-sm text-studio-muted" aria-hidden>
                      ⋮⋮
                    </span>
                    <span className="flex-1 font-mono text-ui-sm uppercase tracking-wider text-studio-ink">
                      {topic}
                    </span>
                    <label className="flex items-center gap-1 font-mono text-ui-sm text-studio-muted">
                      w
                      <input
                        type="number"
                        step="0.1"
                        value={weights[topic] ?? 1}
                        onChange={(e) =>
                          setWeights((prev) => ({ ...prev, [topic]: Number(e.target.value) }))
                        }
                        className="w-16 border border-studio-rule bg-studio-paper px-1 py-0.5 text-right text-studio-ink outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 font-mono text-ui-sm text-studio-muted">
                      n
                      <input
                        type="number"
                        min="1"
                        value={counts[topic] ?? DEFAULT_COUNT}
                        onChange={(e) =>
                          setCounts((prev) => ({ ...prev, [topic]: Number(e.target.value) }))
                        }
                        className="w-14 border border-studio-rule bg-studio-paper px-1 py-0.5 text-right text-studio-ink outline-none"
                      />
                    </label>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>

        <footer className="border-t border-studio-rule px-4 py-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="w-full border border-studio-rule bg-studio-paper px-3 py-2 font-sans text-ui-sm font-semibold text-studio-ink disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save prominence'}
          </button>
        </footer>
      </aside>
    </>
  );
}
