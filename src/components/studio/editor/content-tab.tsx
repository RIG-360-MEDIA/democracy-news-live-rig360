'use client';

import { useEffect, useRef, useState } from 'react';

import { diffLines, hasChanges } from './diff';
import { joinBlocks, replaceBlock, insertBlockAfter, removeBlock, splitBlocks } from './markdown';
import MarkdownPreview from './markdown-preview';

// Content tab — WYSIWYG-in-place. Headline + dek render in their final serif
// look but stay editable; the body is a stack of block-level textareas with a
// live markdown preview beside each. Every keystroke flows up to the shell,
// which debounce-saves the whole story as an editorial override. A "view
// original" toggle diffs generated vs edited.

interface Generated {
  headline: string;
  dek: string;
  body: string;
}

export interface ContentTabProps {
  headline: string;
  dek: string;
  body: string;
  generated: Generated;
  onHeadline: (v: string) => void;
  onDek: (v: string) => void;
  onBody: (v: string) => void;
}

function DiffView({ title, before, after }: { title: string; before: string; after: string }) {
  const rows = diffLines(before, after);
  const changed = hasChanges(before, after);
  return (
    <div className="mb-4">
      <div className="mb-1 font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
        {title}
        {!changed && <span className="ml-2 normal-case tracking-normal">— unchanged</span>}
      </div>
      <div className="border border-studio-rule font-mono text-ui-md">
        {rows.map((r, i) => (
          <div
            key={i}
            className={[
              'whitespace-pre-wrap px-2 py-0.5',
              r.kind === 'del' ? 'bg-studio-accent/10 text-studio-accent line-through' : '',
              r.kind === 'add' ? 'bg-studio-ink/[0.05] text-studio-ink' : '',
              r.kind === 'same' ? 'text-studio-muted' : '',
            ].join(' ')}
          >
            <span className="mr-2 select-none text-studio-muted">
              {r.kind === 'del' ? '−' : r.kind === 'add' ? '+' : ' '}
            </span>
            {r.text || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A textarea that grows to fit its content — no fixed rows, no inner scrollbar,
 *  so each block's editor hugs its text instead of leaving an empty box. */
function AutoTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    />
  );
}

export default function ContentTab({
  headline,
  dek,
  body,
  generated,
  onHeadline,
  onDek,
  onBody,
}: ContentTabProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const blocks = splitBlocks(body);

  if (showOriginal) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-d-xs text-studio-ink">Generated vs edited</h2>
          <button
            type="button"
            onClick={() => setShowOriginal(false)}
            className="border border-studio-rule px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:border-studio-ink"
          >
            Back to editing
          </button>
        </div>
        <DiffView title="Headline" before={generated.headline} after={headline} />
        <DiffView title="Dek" before={generated.dek} after={dek} />
        <DiffView title="Body" before={generated.body} after={body} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-d-xs text-studio-ink">Story</h2>
        <button
          type="button"
          onClick={() => setShowOriginal(true)}
          className="border border-studio-rule px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:border-studio-ink"
        >
          View original
        </button>
      </div>

      {/* Headline — rendered in its final serif look, but editable in place. */}
      <label className="mb-1 block font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Headline</label>
      <AutoTextarea
        value={headline}
        onChange={onHeadline}
        className="mb-5 w-full resize-none overflow-hidden border-0 border-b border-studio-rule bg-transparent font-display text-d-sm text-studio-ink outline-none focus:border-studio-ink"
      />

      {/* Dek — serif, italic, editable in place. */}
      <label className="mb-1 block font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Dek</label>
      <AutoTextarea
        value={dek}
        onChange={onDek}
        className="mb-6 w-full resize-none overflow-hidden border-0 border-b border-studio-rule bg-transparent font-display text-b-lg italic text-studio-ink outline-none focus:border-studio-ink"
      />

      {/* Body — block-level textareas with live markdown preview. */}
      <label className="mb-2 block font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
        Body — markdown ( ## subhead · **bold** · [link](url) )
      </label>
      <div className="flex flex-col gap-4">
        {blocks.map((block, i) => (
          <div key={i} className="grid grid-cols-2 items-start gap-3 border border-studio-rule p-3">
            <div>
              <AutoTextarea
                value={block}
                onChange={(v) => onBody(joinBlocks(replaceBlock(blocks, i, v)))}
                className="w-full resize-none overflow-hidden bg-studio-paper font-mono text-ui-md leading-relaxed text-studio-ink outline-none"
              />
              <div className="mt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => onBody(joinBlocks(insertBlockAfter(blocks, i, '')))}
                  className="font-mono text-ui-sm text-studio-muted hover:text-studio-ink"
                >
                  + block
                </button>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onBody(joinBlocks(removeBlock(blocks, i)))}
                    className="font-mono text-ui-sm text-studio-muted hover:text-studio-accent"
                  >
                    remove
                  </button>
                )}
              </div>
            </div>
            <div className="border-l border-studio-rule pl-3">
              <MarkdownPreview blocks={[block]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
