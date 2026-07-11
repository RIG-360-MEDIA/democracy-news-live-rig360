'use client';

// Shared CMS story card — one visual language across Desk / Queue / Create.
// Thumbnail + status badge + kicker + headline (site serif) + an optional action/meta footer.

import Link from 'next/link';

export interface CmsCardBadge {
  label: string;
  bg: string;
  fg: string;
}

export interface CmsCardProps {
  href: string;
  image: string | null;
  kicker: string;
  headline: string;
  badge?: CmsCardBadge;
  footer?: React.ReactNode;
  dim?: boolean;
}

export function CmsCard({ href, image, kicker, headline, badge, footer, dim }: CmsCardProps) {
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <Link href={href} style={{ display: 'block', position: 'relative' }} aria-label={headline}>
        <img
          src={image ?? '/cards/placeholder.png'}
          alt=""
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: '#eee', display: 'block', opacity: dim ? 0.5 : 1 }}
          onError={(e) => { const t = e.currentTarget; if (t.dataset.fb) return; t.dataset.fb = '1'; t.src = '/cards/placeholder.png'; }}
        />
        {badge && (
          <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', color: badge.fg, background: badge.bg, padding: '3px 8px', borderRadius: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
            {badge.label}
          </span>
        )}
      </Link>
      <div style={{ padding: '13px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: '#1b4b91', textTransform: 'uppercase', marginBottom: 7 }}>
          {kicker}
        </div>
        <Link href={href} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 17, fontWeight: 600, lineHeight: 1.2, color: dim ? '#999' : '#111', margin: 0, textWrap: 'balance' }}>
            {headline}
          </h3>
        </Link>
        {footer && <div style={{ marginTop: 'auto', paddingTop: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Shared responsive grid so every CMS list lays out identically. */
export function CmsCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 20 }}>
      {children}
    </div>
  );
}
