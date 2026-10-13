'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import type { PlaylistVideo } from '@/lib/youtube/client';

// The review desk: thumbnail tiles (the site's Watch-band look); clicking one opens a THEATER over the CMS (the page stays
// behind, blurred) with the video large, its story/description, and Approve / Reject right there, ← → through the lane.

const EXPIRE_H = 36;
const SERIF = 'var(--font-fraunces), Georgia, serif';
const RED = '#a8141a';
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function age(iso: string): { text: string; urgent: boolean } {
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  const left = EXPIRE_H - h;
  return {
    text: h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : `${Math.floor(h)} h ago · expires in ${Math.max(0, Math.ceil(left))} h`,
    urgent: left < 6,
  };
}

type Lane = 'pending' | 'published';
type Edit = { title: string; description: string };

function Tile({ v, onOpen, children }: { v: PlaylistVideo; onOpen: () => void; children?: React.ReactNode }) {
  return (
    <div className="vr-card">
      <button type="button" className="vr-tile" onClick={onOpen} aria-label={`Watch: ${v.title}`}>
        <img src={thumb(v.videoId)} alt="" />
        <span className="vr-shade" />
        <span className="vr-play" aria-hidden="true">
          <svg width={18} height={21} viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff" /></svg>
        </span>
        <span className="vr-watch">Watch &amp; review</span>
      </button>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: RED }}>{v.kicker}</span>
        <b style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.2 }}>{v.title}</b>
        {children}
      </div>
    </div>
  );
}

function Theater({ list, index, lane, busy, onClose, onStep, onApprove, onReject, onSave }: {
  list: PlaylistVideo[]; index: number; lane: Lane; busy: boolean;
  onClose: () => void; onStep: (d: number) => void; onApprove: (v: PlaylistVideo, edit?: Edit) => void;
  onReject: (v: PlaylistVideo, reason: string) => void; onSave: (v: PlaylistVideo, edit: Edit) => Promise<boolean>;
}) {
  const v = list[index];
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState(v?.title ?? '');
  const [description, setDescription] = useState(v?.description ?? '');
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    setRejecting(false); setReason(''); setSaved(null);
    setTitle(v?.title ?? ''); setDescription(v?.description ?? '');
  }, [v?.videoId, v?.title, v?.description]);
  const dirty = !!v && (title.trim() !== v.title || description !== v.description);
  const linked = /long-read\/[0-9a-f-]{36}/i.test(description);
  const bytes = new TextEncoder().encode(description).length;
  const problem = !title.trim() ? 'Title is empty' : title.length > 100 ? 'Title is over 100 characters'
    : /[<>]/.test(title + description) ? 'YouTube does not allow < or >' : bytes > 5000 ? 'Description is over 5000 bytes' : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, onStep]);
  if (!v) return null;
  const a = age(v.addedAt);
  const round: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.3)' };
  const big = (bg: string, fg = '#fff'): React.CSSProperties => ({ padding: '11px 22px', borderRadius: 999, border: 0, background: bg, color: fg, fontSize: 13.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 });
  return (
    <div role="dialog" aria-modal="true" aria-label="Review video" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: 'rgba(7,6,6,0.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      {/* ambient glow from the video's own colours */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: '-12%', backgroundImage: `url(${thumb(v.videoId)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) saturate(1.7) brightness(0.45)', opacity: 0.55 }} />
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '18px 24px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#ff6b6b' }}>
            {lane === 'pending' ? 'Awaiting approval' : 'Published'} · {v.kicker} · {index + 1}/{list.length}
          </div>
          <div style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.1rem, 1.9vw, 1.55rem)', fontWeight: 700, lineHeight: 1.15, marginTop: 4, maxWidth: '70ch' }}>{v.title}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, flexWrap: 'wrap' }}>
            {v.storyId && <a href={`/long-read/${v.storyId}`} target="_blank" rel="noreferrer" style={{ color: '#f2ece2' }}>Story page ↗</a>}
            <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer" style={{ color: '#f2ece2' }}>YouTube ↗</a>
            {lane === 'pending' && <span style={{ color: a.urgent ? '#ff8a8a' : 'rgba(255,255,255,0.6)' }}>Uploaded {a.text}</span>}
          </div>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} style={round}>
          <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15" stroke="#fff" strokeWidth="1.6" /></svg>
        </button>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="vr-stage">
        <button type="button" aria-label="Previous video" onClick={() => onStep(-1)} disabled={list.length < 2} style={{ ...round, visibility: list.length < 2 ? 'hidden' : 'visible' }}>
          <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="#fff" strokeWidth="1.8" /></svg>
        </button>
        <div className="vr-player">
          <iframe key={v.videoId} title={v.title} src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
        </div>
        <div className="vr-edit">
          <label className="vr-label">Title on YouTube & the site <span>{title.length}/100</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="vr-field" />
          <label className="vr-label">Description <span>{bytes}/5000</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="vr-field vr-desc" />
          <p className="vr-hint">
            Line 1 is the label on the site (e.g. &quot;Breaking news · Panama&quot;). Keep the &quot;Read the full story&quot; link —
            {linked ? ' it is how the video finds its story page.' : <b style={{ color: '#ff8a8a' }}> it is missing: the site cannot place this video on a story page.</b>}
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto' }}>
            <button type="button" disabled={!dirty || !!problem || busy} style={big(dirty && !problem ? '#1b4b91' : 'rgba(255,255,255,0.1)')}
              onClick={async () => { if (await onSave(v, { title: title.trim(), description })) setSaved('Saved to YouTube'); }}>
              Save changes
            </button>
            <span style={{ fontSize: 12, color: problem ? '#ff8a8a' : 'rgba(255,255,255,0.65)' }}>
              {problem ?? (dirty ? 'Unsaved changes' + (lane === 'pending' ? ' — Approve saves them too' : '') : saved ?? '')}
            </span>
          </div>
        </div>
        <button type="button" aria-label="Next video" onClick={() => onStep(1)} disabled={list.length < 2} style={{ ...round, visibility: list.length < 2 ? 'hidden' : 'visible' }}>
          <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2l6 6-6 6" fill="none" stroke="#fff" strokeWidth="1.8" /></svg>
        </button>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', padding: '16px 24px 22px', display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {lane === 'pending' && !rejecting && (
          <>
            <button type="button" disabled={busy || !!problem} onClick={() => onApprove(v, dirty ? { title: title.trim(), description } : undefined)} style={big('#2e7d32')}>
              {busy ? 'Working…' : dirty ? 'Save & approve — publish to YouTube & the site' : 'Approve — publish to YouTube & the site'}
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} style={big('rgba(255,255,255,0.12)', '#ffb3b3')}>Reject</button>
          </>
        )}
        {lane === 'pending' && rejecting && (
          <>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus placeholder="Why reject? (kept in the audit log)"
              style={{ width: 'min(520px, 70vw)', padding: '11px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 13.5 }} />
            <button type="button" disabled={busy || !reason.trim()} onClick={() => onReject(v, reason)} style={big(RED)}>{busy ? 'Deleting…' : 'Delete from YouTube'}</button>
            <button type="button" onClick={() => setRejecting(false)} style={big('rgba(255,255,255,0.12)')}>Cancel</button>
          </>
        )}
        {lane === 'published' && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5 }}>Published · ← → browse · Esc close</span>}
      </div>
    </div>
  );
}

export function VideosClient({ pending, published }: { pending: PlaylistVideo[]; published: PlaylistVideo[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<{ lane: Lane; index: number } | null>(null);
  const list = open ? (open.lane === 'pending' ? pending : published) : [];

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((o) => {
    if (!o) return o;
    const n = (o.lane === 'pending' ? pending : published).length;
    return n ? { ...o, index: (o.index + d + n) % n } : o;
  }), [pending, published]);

  async function save(v: PlaylistVideo, edit: Edit): Promise<boolean> {
    setBusy(true);
    try {
      const r = await fetch(`/api/studio/videos/${v.videoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        alert(`Save failed: ${j?.error?.message ?? r.status}`);
        return false;
      }
      start(() => router.refresh());
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function act(v: PlaylistVideo, kind: 'approve' | 'reject', body?: unknown, edit?: Edit): Promise<void> {
    if (edit && !(await save(v, edit))) return;                     // Approve publishes what the editor sees
    setBusy(true);
    try {
      const r = await fetch(`/api/studio/videos/${v.videoId}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        alert(`${kind === 'approve' ? 'Approve' : 'Reject'} failed: ${j?.error?.message ?? r.status}`);
        return;
      }
      // Next in the queue stays open (the decided video leaves the list on refresh); close when it was the last one.
      setOpen((o) => (o && pending.length > 1 ? { lane: 'pending', index: Math.min(o.index, pending.length - 2) } : null));
      start(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a6d1a', margin: '6px 0 10px' }}>Awaiting approval</h2>
      {pending.length === 0 && <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Nothing waiting. New videos arrive here after each evening&apos;s run.</p>}
      <div className="vr-grid">
        {pending.map((v, i) => {
          const a = age(v.addedAt);
          return (
            <Tile key={v.videoId} v={v} onOpen={() => setOpen({ lane: 'pending', index: i })}>
              <span style={{ fontSize: 11.5, color: a.urgent ? RED : '#888' }}>Uploaded {a.text}</span>
              <button type="button" onClick={() => setOpen({ lane: 'pending', index: i })}
                style={{ marginTop: 'auto', fontSize: 12.5, fontWeight: 700, padding: '9px 6px', borderRadius: 8, border: '1px solid #c9dcf5', background: '#fff', color: '#1b4b91', cursor: 'pointer' }}>
                Watch &amp; decide
              </button>
            </Tile>
          );
        })}
      </div>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2e7d32', margin: '6px 0 10px' }}>Published recently</h2>
      {published.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>None yet.</p>}
      <div className="vr-grid">
        {published.map((v, i) => <Tile key={v.videoId} v={v} onOpen={() => setOpen({ lane: 'published', index: i })} />)}
      </div>

      {open && list[open.index] && (
        <Theater list={list} index={open.index} lane={open.lane} busy={busy} onClose={close} onStep={step}
          onApprove={(v, edit) => act(v, 'approve', undefined, edit)} onReject={(v, reason) => act(v, 'reject', { reason })} onSave={save} />
      )}

      <style>{`
        .vr-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));margin-bottom:28px;}
        .vr-card{border:1px solid #e4e0d8;border-radius:10px;background:#fff;overflow:hidden;display:flex;flex-direction:column;
          transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s ease;}
        .vr-card:hover{transform:translateY(-4px);box-shadow:0 18px 36px -16px rgba(168,20,26,.35),0 6px 16px rgba(0,0,0,.12);}
        .vr-tile{position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:0;cursor:pointer;background:#140d0e;overflow:hidden;}
        .vr-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s ease;}
        .vr-tile:hover img{transform:scale(1.05);}
        .vr-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,5,6,.05),rgba(8,5,6,.55));}
        .vr-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58px;height:58px;border-radius:50%;
          background:${RED};display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.5);transition:transform .25s ease;}
        .vr-play svg{margin-left:3px;}
        .vr-tile:hover .vr-play{transform:translate(-50%,-50%) scale(1.08);}
        .vr-stage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:14px;padding:0 16px;}
        .vr-player{position:relative;flex:0 1 auto;width:min(1050px,calc((100dvh - 230px) * 16 / 9),calc(100vw - 560px));aspect-ratio:16/9;
          background:#000;border-radius:4px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.85);}
        .vr-edit{width:380px;flex:0 0 380px;align-self:stretch;max-height:calc(100dvh - 210px);display:flex;flex-direction:column;gap:8px;
          padding:16px;border-radius:10px;background:rgba(10,8,8,.6);border:1px solid rgba(255,255,255,.12);overflow:auto;}
        .vr-label{display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.7);}
        .vr-label span{letter-spacing:0;font-weight:600;color:rgba(255,255,255,.45);}
        .vr-field{width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.4);color:#fff;
          font-size:13.5px;line-height:1.45;font-family:inherit;}
        .vr-field:focus{outline:2px solid #6aa0ff;outline-offset:1px;}
        .vr-desc{flex:1;min-height:180px;resize:vertical;}
        .vr-hint{font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.6);margin:0;}
        @media(max-width:1100px){.vr-stage{flex-direction:column;overflow:auto;padding:0 16px 8px;}
          .vr-player{width:min(100%,calc((100dvh - 260px) * 16 / 9));} .vr-edit{width:100%;flex:none;max-height:none;}}
        .vr-watch{position:absolute;left:12px;bottom:10px;font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#fff;}
      `}</style>
    </div>
  );
}
