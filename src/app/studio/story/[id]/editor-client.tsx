'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { StoryForEdit } from '@/lib/studio/story';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

const btn: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '5px 11px',
  borderRadius: 5,
  border: '1px solid #d5d5d5',
  background: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '.05em',
  color: '#888',
  textTransform: 'uppercase',
  marginBottom: 5,
  display: 'block',
};

const field: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 7,
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
  color: '#111',
  resize: 'vertical',
};

const readonly: React.CSSProperties = {
  ...field,
  background: '#fbfbfb',
  border: '1px solid #eee',
  color: '#888',
  cursor: 'default',
};

export function StoryEditorClient({ story }: { story: StoryForEdit }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const [headline, setHeadline] = useState(story.effective.headline);
  const [dek, setDek] = useState(story.effective.deck);
  const [body, setBody] = useState(story.effective.body);
  const [image, setImage] = useState(story.effective.image ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const killed = story.override?.action === 'killed';
  const locked = story.override?.humanLocked ?? false;

  function touch(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setSaveState('dirty');
    };
  }

  async function save() {
    setBusy('save');
    setSaveState('saving');
    try {
      const r = await fetch('/api/studio/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.storyId, headline, dek, body, image }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        alert('Save failed: ' + (j?.error?.message ?? r.status));
        setSaveState('dirty');
      } else {
        setSaveState('saved');
        start(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  async function act(kind: string, extra: Record<string, unknown> = {}) {
    setBusy(kind);
    try {
      const r = await fetch('/api/studio/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.storyId, kind, ...extra }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        alert('Action failed: ' + (j?.error?.message ?? r.status));
      } else {
        start(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Save edits';

  return (
    <div style={{ opacity: pending ? 0.6 : 1, transition: 'opacity .15s' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {killed ? (
          <button style={btn} disabled={busy !== null} onClick={() => act('revive')}>
            ♻ Revive
          </button>
        ) : (
          <button
            style={{ ...btn, color: '#a8141a', borderColor: '#f0c9c7' }}
            disabled={busy !== null}
            onClick={() => {
              const reason = prompt('Kill this story — reason (optional):') ?? undefined;
              act('kill', reason ? { reason } : {});
            }}
          >
            ✕ Kill
          </button>
        )}
        <button style={btn} disabled={busy !== null} onClick={() => act('pin', { rank: 1 })}>
          📌 Pin
        </button>
        <button style={btn} disabled={busy !== null} onClick={() => act('lock', { locked: !locked })}>
          {locked ? '🔓 Unlock' : '🔒 Lock'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, fontWeight: 600, margin: 0 }}>
              Editable
            </h2>
            <span style={{ fontSize: 11, color: saveState === 'saved' ? '#2e7d32' : '#888' }}>
              {saveState === 'dirty'
                ? 'Unsaved changes'
                : saveState === 'saved'
                  ? 'Saved · story locked'
                  : locked
                    ? 'Locked'
                    : ''}
            </span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Headline</label>
            <input style={field} value={headline} onChange={touch(setHeadline)} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Dek</label>
            <textarea style={{ ...field, minHeight: 64 }} value={dek} onChange={touch(setDek)} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Thumbnail image</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <img
                src={image || '/cards/fallback-1.png'}
                alt=""
                style={{ width: 116, height: 74, objectFit: 'cover', borderRadius: 7, border: '1px solid #e2e2e2', background: '#f0f0f0', flex: '0 0 auto' }}
                onError={(e) => { const t = e.currentTarget; if (t.dataset.fb) return; t.dataset.fb = '1'; t.src = '/cards/fallback-1.png'; }}
              />
              <div style={{ flex: 1 }}>
                <input
                  style={field}
                  value={image}
                  placeholder="Paste an image URL (https://…)"
                  onChange={(e) => { setImage(e.target.value); setSaveState('dirty'); }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{ ...btn, fontSize: 10.5, padding: '3px 8px' }}
                    onClick={() => { setImage(story.generated.image ?? ''); setSaveState('dirty'); }}
                    title="Discard your image and use the machine's original"
                  >
                    ↺ Reset to original
                  </button>
                  <span style={{ fontSize: 10.5, color: '#999' }}>
                    {image && image !== story.generated.image ? 'Custom image' : "Machine's image"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Body (markdown — ## subheads)</label>
            <textarea
              style={{ ...field, minHeight: 380, fontFamily: 'var(--font-mono), monospace', fontSize: 13, lineHeight: 1.6 }}
              value={body}
              onChange={touch(setBody)}
            />
          </div>

          <button
            style={{
              ...btn,
              fontSize: 13,
              padding: '9px 18px',
              color: '#fff',
              background: '#1b4b91',
              borderColor: '#1b4b91',
              opacity: busy !== null ? 0.7 : 1,
            }}
            disabled={busy !== null}
            onClick={save}
          >
            {saveLabel}
          </button>
          <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
            Saving locks the story so the pipeline can’t overwrite your edits.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>
            Generated original
          </h2>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Headline</label>
            <input style={readonly} value={story.generated.headline} readOnly />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Dek</label>
            <textarea style={{ ...readonly, minHeight: 64 }} value={story.generated.deck} readOnly />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Body</label>
            <textarea
              style={{ ...readonly, minHeight: 380, fontFamily: 'var(--font-mono), monospace', fontSize: 13, lineHeight: 1.6 }}
              value={story.generated.body}
              readOnly
            />
          </div>
        </section>
      </div>
    </div>
  );
}
