'use client';

import { useCallback, useState } from 'react';

import { useToast } from '@/components/studio/ui';
import type { AuditRow, DoorBPublishRecord } from '@/lib/studio/audit';
import type { EditorialOverride } from '@/lib/studio/types';

import { DoorBRecord, OverrideDiff } from './audit-diff';

// The audit actions an editor can filter by. Free-text stays possible via the
// story/editor fields; this list covers what the override + publish paths emit.
const ACTIONS = [
  'publish',
  'unpublish',
  'unpin',
  'kill',
  'revive',
  'pin',
  'boost',
  'suppress',
  'lock',
  'unlock',
  'edit',
  'undo',
  'doorb_publish',
] as const;

// Actions that read as destructive/reverting — the only ones that earn the accent.
const DESTRUCTIVE = new Set(['kill', 'unpublish', 'suppress', 'lock', 'undo']);

interface Filters {
  editor: string;
  action: string;
  storyId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { editor: '', action: '', storyId: '', from: '', to: '' };

interface AuditClientProps {
  initialRows: AuditRow[];
  limit: number;
}

/** Undoable client-side (mirrors isUndoable in audit.ts; kept inline so this
 *  client bundle never imports the db-backed lib module). */
function undoable(row: AuditRow): boolean {
  return row.action !== 'doorb_publish' && row.storyId !== null && row.before !== null;
}

/** The story label: an editor headline (Fraunces) if we have one, else the id. */
function storyLabel(row: AuditRow): { text: string; isHeadline: boolean } {
  const snap =
    row.action !== 'doorb_publish'
      ? ((row.after as EditorialOverride | null) ?? row.before)
      : row.before;
  const headline = snap?.editedHeadline?.trim();
  if (headline) return { text: headline, isHeadline: true };
  if (row.storyId) return { text: `${row.storyId.slice(0, 8)}…`, isHeadline: false };
  return { text: '—', isHeadline: false };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AuditClient({ initialRows, limit }: AuditClientProps) {
  const toast = useToast();
  const [rows, setRows] = useState<AuditRow[]>(initialRows);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<number | null>(null);

  const load = useCallback(
    async (f: Filters) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (f.editor.trim()) qs.set('editor', f.editor.trim());
        if (f.action) qs.set('action', f.action);
        if (f.storyId.trim()) qs.set('storyId', f.storyId.trim());
        if (f.from) qs.set('from', `${f.from}T00:00:00`);
        if (f.to) qs.set('to', `${f.to}T23:59:59.999`);
        qs.set('limit', String(limit));

        const res = await fetch(`/api/studio/audit?${qs.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          toast.show(json?.error?.message ?? `Load failed (${res.status})`, 'error');
          return;
        }
        setRows(json.data as AuditRow[]);
        setExpanded(new Set());
      } catch (e: unknown) {
        toast.show(e instanceof Error ? e.message : 'Load failed', 'error');
      } finally {
        setLoading(false);
      }
    },
    [limit, toast],
  );

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function undo(row: AuditRow) {
    setUndoingId(row.id);
    try {
      const res = await fetch('/api/studio/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.show(json?.error?.message ?? `Undo failed (${res.status})`, 'error');
        return;
      }
      toast.show(`Reverted — ${row.action} on ${row.storyId?.slice(0, 8) ?? 'story'}`);
      await load(filters);
    } catch (e: unknown) {
      toast.show(e instanceof Error ? e.message : 'Undo failed', 'error');
    } finally {
      setUndoingId(null);
    }
  }

  const th = 'px-3 py-2 text-left align-bottom font-mono text-ui-sm uppercase tracking-wider text-studio-muted';
  const td = 'px-3 py-2 align-top font-mono text-ui-sm text-studio-ink';

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-studio-ink">Audit log</h1>
        <p className="mt-1 max-w-prose font-sans text-ui-md text-studio-muted">
          Every override, in order — the append-only ledger of who changed what, and the signal for
          how often the desk corrects the machine.
        </p>
      </header>

      {/* Filters */}
      <form
        className="mb-5 flex flex-wrap items-end gap-3 border border-studio-rule bg-studio-paper p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load(filters);
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Editor</span>
          <input
            value={filters.editor}
            onChange={(e) => setFilters((p) => ({ ...p, editor: e.target.value }))}
            placeholder="email"
            className="border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-md text-studio-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Action</span>
          <select
            value={filters.action}
            onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
            className="border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-md text-studio-ink"
          >
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Story id</span>
          <input
            value={filters.storyId}
            onChange={(e) => setFilters((p) => ({ ...p, storyId: e.target.value }))}
            placeholder="uuid"
            className="w-56 border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-md text-studio-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">From</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
            className="border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-md text-studio-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">To</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            className="border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-md text-studio-ink"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="border border-studio-ink bg-studio-ink px-4 py-1.5 font-mono text-ui-md uppercase tracking-wider text-studio-paper disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setFilters(EMPTY_FILTERS);
            void load(EMPTY_FILTERS);
          }}
          className="border border-studio-rule px-4 py-1.5 font-mono text-ui-md uppercase tracking-wider text-studio-muted disabled:opacity-50"
        >
          Reset
        </button>
      </form>

      {/* Ledger */}
      {rows.length === 0 ? (
        <p className="font-mono text-ui-md text-studio-muted">No editorial actions match.</p>
      ) : (
        <div className="overflow-x-auto border border-studio-rule">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-studio-rule">
                <th className={`${th} w-8`} aria-label="Expand" />
                <th className={th}>Time</th>
                <th className={th}>Editor</th>
                <th className={th}>Action</th>
                <th className={th}>Story</th>
                <th className={`${th} text-right`}>Undo</th>
              </tr>
            </thead>
            {rows.map((row) => {
              const open = expanded.has(row.id);
              const label = storyLabel(row);
              const canUndo = undoable(row);
              const isDoorB = row.action === 'doorb_publish';
              return (
                <tbody key={row.id} className="border-b border-studio-rule">
                  <tr
                    className="cursor-pointer hover:bg-studio-rule/20"
                    onClick={() => toggle(row.id)}
                  >
                    <td className={`${td} text-studio-muted`} aria-hidden>
                      {open ? '▾' : '▸'}
                    </td>
                    <td className={`${td} whitespace-nowrap text-studio-muted`}>{formatTime(row.at)}</td>
                    <td className={td}>{row.editorId}</td>
                    <td className={`${td} uppercase ${DESTRUCTIVE.has(row.action) ? 'text-studio-accent' : 'text-studio-ink'}`}>
                      {row.action}
                    </td>
                    <td className={td}>
                      {label.isHeadline ? (
                        <span className="font-display text-ui-lg text-studio-ink">{label.text}</span>
                      ) : (
                        <span className="text-studio-muted">{label.text}</span>
                      )}
                    </td>
                    <td className={`${td} text-right`}>
                      {canUndo ? (
                        <button
                          type="button"
                          disabled={undoingId === row.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void undo(row);
                          }}
                          className="border border-studio-accent px-2 py-0.5 font-mono text-ui-sm uppercase tracking-wider text-studio-accent hover:bg-studio-accent hover:text-studio-paper disabled:opacity-50"
                        >
                          {undoingId === row.id ? '…' : 'Undo'}
                        </button>
                      ) : (
                        <span className="text-studio-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td className="px-3 pb-4 pt-1" colSpan={6}>
                        <div className="border-l-2 border-studio-rule pl-4">
                          {isDoorB ? (
                            <DoorBRecord after={(row.after as DoorBPublishRecord | null) ?? null} />
                          ) : (
                            <OverrideDiff
                              before={row.before}
                              after={(row.after as EditorialOverride | null) ?? null}
                            />
                          )}
                          {row.storyId && (
                            <p className="mt-2 font-mono text-ui-sm text-studio-muted">story {row.storyId}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </div>
  );
}
