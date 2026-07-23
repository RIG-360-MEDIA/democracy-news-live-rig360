import type { ReactNode } from 'react';

// The canonical Studio story row. Preserves the current desk look:
// small rectangular thumbnail left, serif (Fraunces) headline, one-line muted
// dek, a JetBrains-mono meta line, and a right-aligned actions slot (children).
// Presentational only — no client state; callers wrap the headline in a link if
// they need navigation via `href`.

export interface StoryRowCardProps {
  headline: string;
  /** Thumbnail URL, or null for the neutral placeholder. */
  thumbnail: string | null;
  /** One-line dek/standfirst; truncated to a single line. */
  dek?: string | null;
  /** Free-form metadata (topic · country · words · timestamp). Rendered mono. */
  meta?: ReactNode;
  /** Optional destination — when set the headline becomes a link. */
  href?: string;
  /** Dim the row (e.g. hidden/held stories). */
  dimmed?: boolean;
  /** Right-aligned action controls. */
  children?: ReactNode;
}

export default function StoryRowCard({
  headline,
  thumbnail,
  dek,
  meta,
  href,
  dimmed = false,
  children,
}: StoryRowCardProps) {
  const headlineEl = (
    <h3
      className={[
        'font-display text-d-xs font-semibold leading-tight text-balance',
        dimmed ? 'text-studio-muted line-through' : 'text-studio-ink',
      ].join(' ')}
    >
      {headline}
    </h3>
  );

  return (
    <article className="flex items-start gap-4 border-b border-studio-rule py-4">
      <div className="h-16 w-24 shrink-0 overflow-hidden border border-studio-rule bg-studio-rule">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS thumbnails, not build-time assets
          <img
            src={thumbnail}
            alt=""
            className={`h-full w-full object-cover ${dimmed ? 'opacity-50' : ''}`}
          />
        ) : (
          <div aria-hidden className="h-full w-full bg-studio-rule" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {meta && (
          <div className="mb-1 truncate font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
            {meta}
          </div>
        )}
        {href ? (
          <a href={href} className="no-underline">
            {headlineEl}
          </a>
        ) : (
          headlineEl
        )}
        {dek && <p className="mt-1 truncate font-sans text-ui-md text-studio-muted">{dek}</p>}
      </div>

      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </article>
  );
}
