'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/studio/ui';

import type { HistoryEntry } from './types';

// History tab — the editorial-audit trail for this story with one-click,
// audited revert. Revert re-applies the `before` snapshot of the chosen entry
// through the same override path (a new audited action), then reloads so the
// editor reflects the restored state rather than overwriting it on autosave.

export interface HistoryTabProps {
  storyId: string;
  loadHistory: (storyId: string) => Promise<HistoryEntry[]>;
  revert: (storyId: string, auditId: number) => Promise<{ ok: boolean; message?: string }>;
}

function changedFields(entry: HistoryEntry): string {
  const before = entry.before;
  const after = entry.after;
  if (!after) return '';
  const fields: string[] = [];
  if (before?.editedHeadline !== after.editedHeadline) fields.push('headline');
  if (before?.editedDek !== after.editedDek) fields.push('dek');
  if (before?.editedBody !== after.editedBody) fields.push('body');
  if (before?.editedImage !== after.editedImage) fields.push('image');
  if (before?.action !== after.action) fields.push('state');
  if (before?.humanLocked !== after.humanLocked) fields.push('lock');
  return fields.join(', ');
}

export default function HistoryTab({ storyId, loadHistory, revert }: HistoryTabProps) {
  const toast = useToast();
  const [entries, setEntries] = useState<ReadonlyArray<HistoryEntry>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await loadHistory(storyId));
    } catch {
      toast.show('Could not load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadHistory, storyId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRevert = async (entry: HistoryEntry) => {
    if (!window.confirm(`Revert the "${entry.action}" change from ${new Date(entry.at).toLocaleString()}?`)) return;
    setBusy(entry.id);
    try {
      const res = await revert(storyId, entry.id);
      if (!res.ok) {
        toast.show(res.message ?? 'Revert failed', 'error');
        return;
      }
      toast.show('Reverted — reloading');
      window.location.reload();
    } catch {
      toast.show('Revert failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-d-xs text-studio-ink">History</h2>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Every editorial action on this story. Reverting re-applies an earlier state as a new audited
        change — nothing is destroyed.
      </p>

      {loading ? (
        <p className="font-sans text-ui-md text-studio-muted">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="font-sans text-ui-md text-studio-muted">No edits recorded for this story yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-studio-rule border border-studio-rule">
          {entries.map((entry) => {
            const fields = changedFields(entry);
            return (
              <li key={entry.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-ui-sm uppercase tracking-wider text-studio-ink">{entry.action}</div>
                  <div className="font-mono text-ui-sm text-studio-muted">
                    {entry.editorId} · {new Date(entry.at).toLocaleString()}
                    {fields && ` · ${fields}`}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void onRevert(entry)}
                  className="shrink-0 border border-studio-rule px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:border-studio-ink disabled:opacity-60"
                >
                  {busy === entry.id ? 'Reverting…' : 'Revert to before'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
