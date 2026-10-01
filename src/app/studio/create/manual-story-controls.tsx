'use client';

// Per-card controls for a manual story in "Recently created" (F9): Edit (inline), Unpublish /
// Republish (editor), Delete (admin only — a soft delete; the row is kept, the story disappears).
// Every button calls /api/studio/manual/[id], which audits the change in the same transaction.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PromptLeakLevel } from '@/lib/studio/prompt-leak';

interface ManualStoryControlsProps {
  id: string;
  headline: string;
  dek: string | null;
  body: string;
  status: string;
  canDelete: boolean;
  /** Headline/dek reads like an internal prompt: 'leak' is hidden from readers, 'suspect' is not. */
  promptFlag: PromptLeakLevel;
}

const PROMPT_FLAG_TEXT: Record<Exclude<PromptLeakLevel, 'none'>, string> = {
  leak: 'Reads like an internal prompt — hidden from readers until the headline/dek is rewritten.',
  suspect: 'Reads a bit like an internal prompt — check the headline/dek before it goes out.',
};

const btn: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 8px',
  border: '1px solid #ddd',
  borderRadius: 5,
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
};
const field: React.CSSProperties = {
  width: '100%',
  fontSize: 12.5,
  padding: '5px 7px',
  border: '1px solid #ddd',
  borderRadius: 5,
  marginBottom: 6,
  fontFamily: 'inherit',
};

async function send(id: string, method: 'PATCH' | 'DELETE', body?: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(`/api/studio/manual/${id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } | null } | null;
    if (!res.ok || !json?.ok) return json?.error?.message ?? `Request failed (${res.status})`;
    return null;
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Network error';
  }
}

export default function ManualStoryControls({
  id,
  headline,
  dek,
  body,
  status,
  canDelete,
  promptFlag,
}: ManualStoryControlsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ headline, dek: dek ?? '', body });
  const live = status.startsWith('PUBLISHABLE');

  async function run(method: 'PATCH' | 'DELETE', payload?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const err = await send(id, method, payload);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function remove() {
    if (!window.confirm('Delete this story? It disappears from the site and this list. The record is kept in the audit log.')) return;
    void run('DELETE');
  }

  return (
    <div style={{ marginTop: 6 }}>
      {!live && (
        <span style={{ fontSize: 9, fontWeight: 800, color: '#8a6d1a', background: '#fff4d6', padding: '2px 6px', borderRadius: 4 }}>
          UNPUBLISHED
        </span>
      )}
      {promptFlag !== 'none' && (
        <p
          role="status"
          style={{
            fontSize: 11,
            margin: '4px 0 0',
            padding: '3px 6px',
            borderRadius: 4,
            color: promptFlag === 'leak' ? '#a8141a' : '#8a6d1a',
            background: promptFlag === 'leak' ? '#fde2e1' : '#fff4d6',
          }}
        >
          {PROMPT_FLAG_TEXT[promptFlag]}
        </p>
      )}
      {editing ? (
        <div style={{ marginTop: 6 }}>
          <input aria-label="Headline" style={field} value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
          <input aria-label="Dek" style={field} value={draft.dek} placeholder="Dek (optional)" onChange={(e) => setDraft({ ...draft, dek: e.target.value })} />
          <textarea aria-label="Body" style={{ ...field, minHeight: 120 }} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={btn} disabled={busy} onClick={() => void run('PATCH', { headline: draft.headline, dek: draft.dek, body: draft.body })}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" style={btn} disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <button type="button" style={btn} disabled={busy} onClick={() => setEditing(true)}>
            Edit
          </button>
          <button
            type="button"
            style={btn}
            disabled={busy}
            onClick={() => void run('PATCH', { status: live ? 'UNPUBLISHED' : 'PUBLISHABLE' })}
          >
            {live ? 'Unpublish' : 'Republish'}
          </button>
          {canDelete && (
            <button type="button" style={{ ...btn, color: '#a8141a', borderColor: '#f0c4c2' }} disabled={busy} onClick={remove}>
              Delete
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" style={{ color: '#a8141a', fontSize: 11.5, marginTop: 4 }}>{error}</p>}
    </div>
  );
}
