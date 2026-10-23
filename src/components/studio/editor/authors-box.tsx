'use client';

// Story editor: the story's authors (byline). Saved with its own button through /api/studio/authors (audited);
// empty = the house byline. Works for live stories - the site updates at once.
import { useState } from 'react';

export default function AuthorsBox({ storyId, initial }: { storyId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  async function save() {
    setState('saving');
    const r = await fetch('/api/studio/authors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId, authors: value }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r?.ok || !j?.ok) {
      setState('error');
      return;
    }
    setSaved(j.data.authors);
    setValue(j.data.authors);
    setState('idle');
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label htmlFor="story-authors" className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Authors</label>
      <input id="story-authors" value={value} onChange={(e) => setValue(e.target.value)}
        placeholder="Democracy News Live Desk"
        className="min-w-[320px] flex-1 border border-studio-rule bg-studio-paper px-2 py-1 font-sans text-ui-md text-studio-ink outline-none" />
      <button type="button" onClick={() => void save()} disabled={state === 'saving' || value.trim() === saved}
        className="border border-studio-rule px-3 py-1 font-sans text-ui-sm font-semibold text-studio-ink disabled:opacity-50">
        {state === 'saving' ? 'Saving…' : 'Save authors'}
      </button>
      {state === 'error' && <span className="font-sans text-ui-sm text-studio-accent">Could not save - try again</span>}
      {state === 'idle' && saved && value.trim() === saved && <span className="font-sans text-ui-sm text-studio-muted">Shown as: {saved}</span>}
    </div>
  );
}
