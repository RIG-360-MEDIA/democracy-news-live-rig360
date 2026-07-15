'use client';

import type { ReactNode } from 'react';

import type { TweetEmbed } from '@/lib/worldwide/detail';

// X brand colours — fixed across light/dark (they read the same on the card in both themes).
const BLUE = '#1d9bf0';
const PINK = '#f91880';

const INK = 'var(--rw-ink)';
const BODY = 'var(--rw-body)';
const MUTED = 'var(--rw-muted)';
const RULE = 'var(--rw-rule)';

/** Compact engagement counts: 30000 → "30K", 1_200_000 → "1.2M". */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

/** "12:23 AM · 04 Jan 2024" from an ISO string; empty on an unparseable date. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${time} · ${date}`;
}

/** Highlight #hashtags and @mentions in X-blue; leave the rest as body text. */
function highlight(text: string): ReactNode[] {
  return text.split(/(#\w+|@\w+)/g).map((part, i) =>
    /^[#@]\w+$/.test(part)
      ? <span key={i} style={{ color: BLUE }}>{part}</span>
      : <span key={i}>{part}</span>,
  );
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" width="16" height="16" aria-label="Verified" style={{ flexShrink: 0 }}>
      <path fill={BLUE} d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
    </svg>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill={INK} d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

const ICON: Record<string, string> = {
  reply: 'M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z',
  repost: 'M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z',
  like: 'M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.378-2.55-7.028-5.19-8.379-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.796 2.010 1.428-1.45 3.147-2.1 4.798-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z',
  views: 'M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z',
  bookmark: 'M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z',
  share: 'M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z',
};

function Stat({ icon, count, active }: { icon: keyof typeof ICON; count?: number; active?: boolean }) {
  const color = active ? PINK : MUTED;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5 }}>
      <svg viewBox="0 0 24 24" width="16.5" height="16.5" aria-hidden="true">
        <path fill={active ? PINK : 'none'} stroke={color} strokeWidth={active ? 0 : 1.8} d={ICON[icon]} />
      </svg>
      {count !== undefined && <span>{fmt(count)}</span>}
    </span>
  );
}

export function TweetCard({ tweet }: { tweet: TweetEmbed }) {
  const initial = (tweet.authorName || tweet.handle || '?').trim().charAt(0).toUpperCase();
  const when = stamp(tweet.postedAt);
  return (
    <a
      href={tweet.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', margin: '14px 0 30px', padding: '16px 18px',
        border: `1px solid ${RULE}`, borderRadius: 16, background: 'var(--rw-bg)',
        textDecoration: 'none', color: BODY,
      }}
    >
      {/* header: avatar · name/handle · Follow */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        {tweet.avatarUrl ? (
          <img src={tweet.avatarUrl} alt="" width={44} height={44}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: RULE }} />
        ) : (
          <span style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: RULE, color: INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jakarta), sans-serif', fontWeight: 700, fontSize: 18 }}>
            {initial}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontWeight: 700, fontSize: 15, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tweet.authorName}
            </span>
            {tweet.verified && <VerifiedBadge />}
          </div>
          <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13.5, color: MUTED }}>
            @{tweet.handle}
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontWeight: 700, fontSize: 13.5, color: 'var(--rw-bg)', background: INK, borderRadius: 999, padding: '5px 15px' }}>
            Follow
          </span>
          <XLogo />
        </span>
      </div>

      {/* body */}
      <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 15.5, lineHeight: 1.5, color: BODY, margin: '13px 0 0' }}>
        {highlight(tweet.text)}
      </p>

      {/* timestamp */}
      {when && (
        <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, color: MUTED, margin: '12px 0 12px' }}>
          {when}
        </div>
      )}

      {/* engagement */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, paddingTop: 12, borderTop: `1px solid ${RULE}` }}>
        <Stat icon="reply" count={tweet.replies} />
        <Stat icon="repost" count={tweet.reposts} />
        <Stat icon="like" count={tweet.likes} active />
        <Stat icon="views" count={tweet.views} />
        <span style={{ flex: 1 }} />
        <Stat icon="bookmark" />
        <Stat icon="share" />
      </div>
    </a>
  );
}
