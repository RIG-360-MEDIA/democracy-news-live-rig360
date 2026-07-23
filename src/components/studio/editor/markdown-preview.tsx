'use client';

import type { ReactNode } from 'react';

import { YT_MARKER } from './markdown';

// Minimal markdown → JSX renderer for the editor's live preview. Supports the
// subset editors actually use: ## / ### subheads, **bold**, *italic*,
// [links](url), ![images](url), and the !youtube[...] embed marker. No external
// dependency. The reader site has its own renderer — this is preview-only.

function renderInline(text: string, keyBase: string): ReactNode[] {
  // Split on bold/italic/link tokens while keeping them. Order matters: links first.
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.filter(Boolean).map((tok, i) => {
    const key = `${keyBase}-${i}`;
    const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a key={key} href={link[2]} className="text-studio-accent underline" rel="noreferrer" target="_blank">
          {link[1]}
        </a>
      );
    }
    if (/^\*\*[^*]+\*\*$/.test(tok)) return <strong key={key}>{tok.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(tok)) return <em key={key}>{tok.slice(1, -1)}</em>;
    return <span key={key}>{tok}</span>;
  });
}

function Block({ block, index }: { block: string; index: number }) {
  const key = `b${index}`;
  const yt = block.match(YT_MARKER);
  if (yt) {
    return (
      <div className="border border-studio-rule bg-studio-paper px-3 py-2">
        <div className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">YouTube embed</div>
        <div className="font-sans text-ui-md text-studio-ink">{yt[1] || '(untitled clip)'}</div>
        <div className="truncate font-mono text-ui-sm text-studio-muted">{yt[2]}</div>
      </div>
    );
  }
  const img = block.match(/^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)$/);
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={img[1]} src={img[2]} className="max-h-56 w-auto border border-studio-rule" />;
  }

  // A block may hold a leading subhead line followed by its paragraph(s) on the
  // next lines (single \n), e.g. "## Subhead\nBody text…". Render each line by
  // its role — a heading line was previously swallowing the whole block into an
  // <h3>. Consecutive plain lines coalesce into one paragraph (markdown soft-wrap).
  const out: ReactNode[] = [];
  let para: string[] = [];
  const flush = () => {
    const text = para.join(' ').trim();
    para = [];
    if (text) {
      const k = `${key}-p${out.length}`;
      out.push(<p key={k} className="font-display text-b-md text-studio-ink">{renderInline(text, k)}</p>);
    }
  };
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    const k = `${key}-l${out.length}`;
    if (!line) { flush(); continue; }
    if (line.startsWith('### ')) {
      flush();
      out.push(<h4 key={k} className="font-display text-b-xl font-semibold text-studio-ink">{renderInline(line.slice(4), k)}</h4>);
    } else if (line.startsWith('## ')) {
      flush();
      out.push(<h3 key={k} className="font-display text-d-xs font-semibold text-studio-ink">{renderInline(line.slice(3), k)}</h3>);
    } else if (line.startsWith('> ')) {
      flush();
      out.push(
        <blockquote key={k} className="border-l-2 border-studio-accent pl-3 font-display text-b-lg italic text-studio-ink">
          {renderInline(line.slice(2), k)}
        </blockquote>,
      );
    } else {
      para.push(line);
    }
  }
  flush();

  if (out.length === 1) return <>{out[0]}</>;
  return <div className="flex flex-col gap-2">{out}</div>;
}

export interface MarkdownPreviewProps {
  blocks: ReadonlyArray<string>;
  className?: string;
}

export default function MarkdownPreview({ blocks, className }: MarkdownPreviewProps) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      {blocks.map((b, i) => (b.trim() ? <Block key={i} block={b.trim()} index={i} /> : null))}
    </div>
  );
}
