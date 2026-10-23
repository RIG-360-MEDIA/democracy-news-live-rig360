'use client';

// Manual authoring form (Door A) — an editor hand-writes a story that bypasses the generator.
//   Save draft  → kept for later (status DRAFT, never on the site); reopened from "Recently created".
//   Publish     → live now (a draft is published in place, POST /api/studio/create otherwise).
//   Upload image / Import document → the image is stored by the site (/api/media/<id>) and its URL filled
//   in; a .docx / .pdf / .txt / .md is read on the server and its headline, strap, body (with section
//   headings) and first picture land in the right fields for the editor to check.
// Unsaved typing is mirrored to this browser's localStorage, so leaving the page does not lose it.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { MANUAL_TOPICS } from '@/lib/studio/topics';

interface FormState {
  headline: string;
  dek: string;
  authors: string;
  body: string;
  topic: string;
  country: string;
  image_url: string;
  importance: string;
}

export interface DraftInit extends FormState {
  id: string;
}

const EMPTY: FormState = {
  headline: '',
  dek: '',
  authors: '',
  body: '',
  topic: 'OTHER',
  country: '',
  image_url: '',
  importance: '40',
};

const BACKUP_KEY = 'dnl-create-unsaved';
const MAX_IMAGE_SIDE = 2000;                      // longest side after the in-browser resize

function readBackup(): (FormState & { draftId?: string }) | null {
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as FormState & { draftId?: string }) : null;
  } catch {
    return null;
  }
}

function writeBackup(v: (FormState & { draftId?: string }) | null): void {
  try {
    if (v) window.localStorage.setItem(BACKUP_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* private window / storage blocked: the form still works, just without the backup */
  }
}

/** Shrink a photo in the browser before upload (JPEG, longest side MAX_IMAGE_SIDE); GIFs are sent as they are. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.88));
}

export default function ManualForm({ initial }: { initial?: DraftInit | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draftId, setDraftId] = useState<string | null>(initial?.id ?? null);
  const [form, setForm] = useState<FormState>(() => (initial ? { ...EMPTY, ...initial } : EMPTY));
  const [busy, setBusy] = useState<null | 'publish' | 'draft' | 'image' | 'import'>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // Bring back unsaved typing from a previous visit (only for the same draft, or a new story).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const b = readBackup();
    if (!b || (b.draftId ?? null) !== (initial?.id ?? null)) return;
    const { draftId: _ignored, ...fields } = b;
    if (JSON.stringify(fields) === JSON.stringify(initial ? { ...EMPTY, ...initial, id: undefined } : EMPTY)) return;
    setForm({ ...EMPTY, ...fields });
    setNote('Restored text you had not saved yet.');
  }, [initial]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      writeBackup({ ...next, ...(draftId ? { draftId } : {}) });
      return next;
    });
  }

  function payload() {
    return {
      headline: form.headline,
      dek: form.dek,
      authors: form.authors,
      topic: form.topic,
      country: form.country,
      image_url: form.image_url,
      importance: Number(form.importance),
    };
  }

  async function call(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok || j?.ok === false) throw new Error(j?.error?.message ?? String(r.status));
    return j?.data as { id?: string } | undefined;
  }

  async function saveDraft() {
    setErr(null);
    setNote(null);
    if (!form.headline.trim()) {
      setErr('Give the draft a headline first.');
      return;
    }
    setBusy('draft');
    try {
      if (draftId) {
        await call(`/api/studio/manual/${draftId}`, 'PATCH', { ...payload(), ...(form.body.trim() ? { body: form.body } : {}) });
      } else {
        const data = await call('/api/studio/create', 'POST', { ...payload(), body: form.body, draft: true });
        if (data?.id) {
          setDraftId(data.id);
          router.replace(`/studio/create?draft=${data.id}`, { scroll: false });
        }
      }
      writeBackup(null);
      setNote(`Draft saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. It is not on the site.`);
      start(() => router.refresh());
    } catch (e) {
      setErr('Save failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setErr(null);
    setNote(null);
    if (!form.headline.trim()) {
      setErr('Headline is required.');
      return;
    }
    if (!form.body.trim()) {
      setErr('Body is required.');
      return;
    }
    setBusy('publish');
    try {
      if (draftId) await call(`/api/studio/manual/${draftId}`, 'PATCH', { ...payload(), body: form.body, status: 'PUBLISHABLE' });
      else await call('/api/studio/create', 'POST', { ...payload(), body: form.body });
      writeBackup(null);
      setForm(EMPTY);
      setDraftId(null);
      setNote('Published - it is live on the site now.');
      if (draftId) router.replace('/studio/create', { scroll: false });
      start(() => router.refresh());
    } catch (e) {
      setErr('Publish failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', await shrink(file), file.name.replace(/\.[^.]+$/, '') + (file.type === 'image/gif' ? '.gif' : '.jpg'));
    const r = await fetch('/api/studio/media/upload', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) throw new Error(j?.error?.message ?? String(r.status));
    return `${window.location.origin}${j.data.path as string}`;
  }

  async function onImage(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setBusy('image');
    try {
      set('image_url', await upload(file));
      setNote('Image uploaded.');
    } catch (e) {
      setErr('Image upload failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(null);
      if (imageInput.current) imageInput.current.value = '';
    }
  }

  async function onDocument(file: File | undefined) {
    if (!file) return;
    setErr(null);
    setNote(null);
    setBusy('import');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/studio/import', { method: 'POST', body: fd });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message ?? String(r.status));
      const d = j.data as { headline: string; dek: string; authors: string; body: string; country: string; imagePath: string | null; headings: number };
      setForm((f) => {
        const next = {
          ...f,
          headline: d.headline || f.headline,
          dek: d.dek || f.dek,
          authors: d.authors || f.authors,
          body: d.body || f.body,
          country: d.country || f.country,
          image_url: d.imagePath ? `${window.location.origin}${d.imagePath}` : f.image_url,
        };
        writeBackup({ ...next, ...(draftId ? { draftId } : {}) });
        return next;
      });
      setNote(`Imported "${file.name}": headline, ${d.authors ? 'authors, ' : ''}strap, body (${d.headings} section headings)${d.imagePath ? ' and its first picture' : ''}. Check every field, then set the topic and importance.`);
    } catch (e) {
      setErr('Import failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(null);
      if (docInput.current) docInput.current.value = '';
    }
  }

  function startNew() {
    writeBackup(null);
    setForm(EMPTY);
    setDraftId(null);
    setErr(null);
    setNote(null);
    router.replace('/studio/create', { scroll: false });
  }

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.03em',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 5,
    display: 'block',
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ddd',
    borderRadius: 7,
    fontSize: 13,
    background: '#fff',
    fontFamily: 'inherit',
  };

  const secondary: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    padding: '9px 14px',
    borderRadius: 7,
    border: '1px solid #c9dcf5',
    background: '#fff',
    color: '#1b4b91',
    cursor: busy ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  };

  const locked = busy !== null || pending;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: draftId ? '#8a6d1a' : '#888' }}>
          {draftId ? 'EDITING A DRAFT (not on the site)' : 'NEW STORY'}
        </span>
        <span style={{ flex: 1 }} />
        <input ref={docInput} type="file" hidden
          accept=".docx,.pdf,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain,text/markdown"
          onChange={(e) => void onDocument(e.target.files?.[0])} />
        <button type="button" style={secondary} disabled={locked} onClick={() => docInput.current?.click()}>
          {busy === 'import' ? 'Reading…' : 'Import document (.docx, .pdf)'}
        </button>
        {draftId && (
          <button type="button" style={secondary} disabled={locked} onClick={startNew}>
            New story
          </button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Headline</label>
        <input style={field} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="The story headline" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Strap</label>
        <input style={field} value={form.dek} onChange={(e) => set('dek', e.target.value)} placeholder="Optional one-line summary under the headline" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Authors</label>
        <input style={field} value={form.authors} onChange={(e) => set('authors', e.target.value)}
          placeholder="e.g. Pranav Puri and Yash Aggarwal (empty = Democracy News Live Desk)" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Body</label>
        <textarea
          style={{ ...field, minHeight: 200, resize: 'vertical', lineHeight: 1.5 }}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder={'Leave an empty line between paragraphs. A section heading goes on its own line: ## What happens next'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={label}>Topic</label>
          <select style={field} value={form.topic} onChange={(e) => set('topic', e.target.value)}>
            {MANUAL_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Country</label>
          <input
            style={field}
            value={form.country}
            onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))}
            placeholder="US"
            maxLength={2}
          />
        </div>
        <div>
          <label style={label}>Importance (0-100)</label>
          <input style={field} type="number" min={0} max={100} value={form.importance} onChange={(e) => set('importance', e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Image</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={field} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://… or upload a file" />
          <input ref={imageInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => void onImage(e.target.files?.[0])} />
          <button type="button" style={secondary} disabled={locked} onClick={() => imageInput.current?.click()}>
            {busy === 'image' ? 'Uploading…' : 'Upload image'}
          </button>
        </div>
        {form.image_url && /^https?:\/\//.test(form.image_url) && (
          // eslint-disable-next-line @next/next/no-img-element -- editor preview of an arbitrary URL
          <img src={form.image_url} alt="" style={{ marginTop: 8, width: 240, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
        )}
      </div>

      {err && <p style={{ color: '#a8141a', fontSize: 12.5, marginBottom: 12 }}>{err}</p>}
      {note && !err && <p style={{ color: '#2e7d32', fontSize: 12.5, marginBottom: 12 }}>{note}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={publish}
          disabled={locked}
          style={{
            fontSize: 13,
            fontWeight: 700,
            padding: '10px 20px',
            borderRadius: 7,
            border: '1px solid #a8141a',
            background: locked ? '#c66' : '#a8141a',
            color: '#fff',
            cursor: locked ? 'default' : 'pointer',
          }}
        >
          {busy === 'publish' ? 'Publishing…' : draftId ? 'Publish draft' : 'Publish story'}
        </button>
        <button type="button" onClick={saveDraft} disabled={locked} style={{ ...secondary, fontSize: 13, padding: '10px 18px' }}>
          {busy === 'draft' ? 'Saving…' : 'Save draft'}
        </button>
      </div>
    </div>
  );
}
