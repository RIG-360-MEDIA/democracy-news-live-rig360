'use client';

import type { Slot, DigestStory } from './digest-data';

/* ═════════════════════════════════════════════════════════════════
   GMAIL PREVIEW — mock browser chrome + Gmail UI + the actual
   personalised newsletter HTML inside it. Editorial-quality.
═════════════════════════════════════════════════════════════════ */

const ACCENT  = '#2e5e3e';
const PAPER_BG = '#ffffff';
const GMAIL_BG = '#f6f8fc';
const GMAIL_BORDER = '#e2e6ea';
const TEXT = '#202124';
const SUB  = '#5f6368';
const FAINT = '#80868b';

export function GmailPreview({ name, email, archetypeName, toneLabel, slot, stories }: {
  name: string; email: string; archetypeName: string; toneLabel: string; slot: Slot;
  stories: DigestStory[];
}) {
  const date = 'Sat, May 23 · 7:31 a.m.';
  return (
    <div className="relative overflow-hidden" style={{
      background: PAPER_BG, border: '1px solid #c8cfd6', borderRadius: 12,
      boxShadow: '0 32px 60px -16px rgba(20,18,14,0.20), 0 12px 24px -8px rgba(20,18,14,0.10)',
    }}>
      {/* ─── Browser chrome (window title bar with traffic lights) ─── */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{
        background: '#e8ebef', borderBottom: '1px solid #c8cfd6',
      }}>
        <span style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: 999 }} />
        <span style={{ width: 12, height: 12, background: '#febc2e', borderRadius: 999 }} />
        <span style={{ width: 12, height: 12, background: '#28c840', borderRadius: 999 }} />
        <div className="flex-1 flex justify-center">
          <div style={{
            background: '#f6f8fc', padding: '4px 14px', borderRadius: 6, fontSize: 11,
            color: SUB, fontFamily: 'system-ui, sans-serif', maxWidth: 320, width: '100%', textAlign: 'center',
          }}>
            🔒 mail.google.com
          </div>
        </div>
      </div>

      {/* ─── Gmail top bar ─── */}
      <div className="flex items-center gap-4 px-4 py-3" style={{
        background: GMAIL_BG, borderBottom: `1px solid ${GMAIL_BORDER}`,
      }}>
        {/* Hamburger */}
        <button className="opacity-70" aria-label="Menu" style={{ color: TEXT }}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="1" y1="2" x2="17" y2="2" /><line x1="1" y1="7" x2="17" y2="7" /><line x1="1" y1="12" x2="17" y2="12" />
          </svg>
        </button>
        {/* Gmail logo (simulated — never use Google's actual mark) */}
        <span className="flex items-center gap-2">
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 22, background: '#fff',
            border: '1px solid #d3d6da', borderRadius: 4, fontSize: 14, fontWeight: 700,
            color: '#c5221f', fontFamily: 'system-ui',
          }}>M</span>
          <span style={{ fontSize: 17, color: SUB, fontFamily: 'system-ui', letterSpacing: '-0.01em' }}>Mailbox</span>
        </span>
        {/* Search bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="flex items-center gap-3 px-4 py-2" style={{ background: '#eaeef3', borderRadius: 8 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={SUB} strokeWidth="1.6" strokeLinecap="round">
              <circle cx="6" cy="6" r="4.5" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
            </svg>
            <span style={{ fontSize: 13, color: SUB, fontFamily: 'system-ui' }}>Search mail</span>
          </div>
        </div>
        <span style={{
          width: 30, height: 30, borderRadius: 999, background: ACCENT, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, fontFamily: 'system-ui',
        }}>{(name || 'R').charAt(0).toUpperCase()}</span>
      </div>

      {/* ─── Gmail sidebar + thread ─── */}
      <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col py-4 gap-1" style={{
          background: GMAIL_BG, borderRight: `1px solid ${GMAIL_BORDER}`,
          fontFamily: 'system-ui, sans-serif',
        }}>
          <button className="mx-3 mb-2 flex items-center gap-2 hover:opacity-90" style={{
            padding: '10px 16px 10px 12px',
            background: '#c6e2cc', color: '#0b3d20',
            borderRadius: 999, fontSize: 13.5, fontWeight: 600,
            border: 'none', cursor: 'pointer', alignSelf: 'start',
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>✏️</span> Compose
          </button>
          {[
            { label: 'Inbox',    count: '12', active: true },
            { label: 'Starred',  count: ''   },
            { label: 'Snoozed',  count: ''   },
            { label: 'Sent',     count: ''   },
            { label: 'Drafts',   count: '3'  },
            { label: 'More',     count: ''   },
          ].map((it) => (
            <div key={it.label} className="flex items-center justify-between mx-1" style={{
              padding: '7px 14px',
              background: it.active ? '#d3e3fd' : 'transparent',
              borderRadius: '0 999px 999px 0',
              fontSize: 13, fontWeight: it.active ? 700 : 500,
              color: it.active ? '#001d35' : TEXT,
            }}>
              <span>{it.label}</span>
              <span style={{ fontSize: 11.5, color: it.active ? '#001d35' : FAINT }}>{it.count}</span>
            </div>
          ))}
          {/* Labels */}
          <div className="mt-4 px-4 py-2" style={{ fontSize: 11, color: FAINT, fontWeight: 700, letterSpacing: '0.02em' }}>LABELS</div>
          {['Newsletters', 'Receipts', 'Work', 'Travel'].map((l) => (
            <div key={l} className="mx-1 flex items-center gap-2.5" style={{
              padding: '6px 14px', fontSize: 12.5, color: TEXT,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l === 'Newsletters' ? ACCENT : '#a8b3bf' }} />
              {l}
            </div>
          ))}
        </aside>

        {/* Thread / email view */}
        <div style={{ background: '#fff', minHeight: 540 }}>
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-5 py-2" style={{ borderBottom: `1px solid ${GMAIL_BORDER}` }}>
            <ToolbarIcon glyph="←" />
            <ToolbarIcon glyph="🗄" />
            <ToolbarIcon glyph="!" />
            <ToolbarIcon glyph="🗑" />
            <span style={{ width: 1, height: 18, background: GMAIL_BORDER, margin: '0 6px' }} />
            <ToolbarIcon glyph="✉" />
            <ToolbarIcon glyph="⏰" />
            <div className="flex-1" />
            <span style={{
              fontFamily: 'system-ui, sans-serif', fontSize: 11.5, color: SUB,
            }}>1 of 12,847</span>
          </div>

          {/* Subject + meta */}
          <div className="px-7 py-5" style={{ borderBottom: `1px solid ${GMAIL_BORDER}` }}>
            <div className="flex items-baseline gap-3 flex-wrap mb-3">
              <h2 style={{
                color: TEXT, fontSize: 22, fontWeight: 400, lineHeight: 1.2,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>Your Digest, {name || 'reader'} — five things for Saturday</h2>
              <span style={{
                padding: '2px 8px', background: '#e8f0fe', color: '#001d35',
                fontSize: 11, fontWeight: 600, borderRadius: 4,
                fontFamily: 'system-ui',
              }}>Inbox</span>
              <span style={{
                padding: '2px 8px', background: '#c6e2cc', color: '#0b3d20',
                fontSize: 11, fontWeight: 600, borderRadius: 4,
                fontFamily: 'system-ui',
              }}>Newsletters</span>
            </div>
            <div className="flex items-start gap-3">
              <span style={{
                width: 38, height: 38, borderRadius: 999, background: ACCENT, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-fraunces), serif', fontSize: 18, fontStyle: 'italic', fontWeight: 600,
                flexShrink: 0,
              }}>D</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: TEXT, fontFamily: 'system-ui' }}>
                    Newsletter — Rig Wire
                  </span>
                  <span style={{ fontSize: 12.5, color: FAINT, fontFamily: 'system-ui' }}>
                    &lt;digest@rigwire.news&gt;
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: SUB, marginTop: 2, fontFamily: 'system-ui' }}>
                  to <strong style={{ color: TEXT, fontWeight: 600 }}>{name || 'you'}</strong> &lt;{email}&gt;
                </p>
                <p style={{ fontSize: 12, color: FAINT, marginTop: 1, fontFamily: 'system-ui' }}>
                  {date}
                </p>
              </div>
              <button style={{
                padding: '6px 12px', background: 'transparent', border: `1px solid ${GMAIL_BORDER}`,
                borderRadius: 999, fontSize: 12, color: SUB, cursor: 'pointer',
                fontFamily: 'system-ui',
              }}>↩ Reply</button>
            </div>
          </div>

          {/* ─── THE NEWSLETTER BODY ─── */}
          <div className="px-5 md:px-10 py-8" style={{ background: '#fdfaf0' }}>
            <NewsletterBody
              name={name}
              archetypeName={archetypeName}
              toneLabel={toneLabel}
              slot={slot}
              stories={stories}
              email={email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarIcon({ glyph }: { glyph: string }) {
  return (
    <button style={{
      width: 30, height: 30, borderRadius: 999, background: 'transparent',
      border: 'none', cursor: 'pointer', color: '#5f6368', fontSize: 14,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>{glyph}</button>
  );
}

/* ═════════════════════════════════════════════════════════════════
   NEWSLETTER BODY — the actual personalised email content
═════════════════════════════════════════════════════════════════ */
function NewsletterBody({ name, archetypeName, toneLabel, slot, stories, email }: {
  name: string; archetypeName: string; toneLabel: string; slot: Slot;
  stories: DigestStory[]; email: string;
}) {
  const NEWS_INK   = '#15130f';
  const NEWS_SUB   = '#3a3633';
  const NEWS_MUTED = '#7a756e';
  const NEWS_RULE  = '#d8cfb3';
  return (
    <div className="mx-auto" style={{
      maxWidth: 580,
      fontFamily: 'var(--font-fraunces), Georgia, serif',
    }}>
      {/* Masthead */}
      <div className="text-center pb-6 mb-7" style={{ borderBottom: `2px solid ${NEWS_INK}` }}>
        <p style={{
          fontFamily: 'var(--font-mono), monospace', color: ACCENT,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>Rig Wire &middot; Newsletter &middot; Saturday, 23 May 2026</p>
        <h1 className="font-display italic" style={{
          color: NEWS_INK, fontSize: 36, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.022em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>Newsletter</h1>
        <p className="italic mt-2" style={{
          color: NEWS_MUTED, fontSize: 14,
          fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        }}>Five stories, five minutes &middot; in the voice of {toneLabel.toLowerCase()}</p>
      </div>

      {/* Greeting */}
      <p style={{ color: NEWS_SUB, fontSize: 16.5, lineHeight: 1.6, marginBottom: 10 }}>
        Good morning{name ? `, ${name}` : ''}.
      </p>
      <p style={{ color: NEWS_SUB, fontSize: 16.5, lineHeight: 1.6, marginBottom: 26 }}>
        Five things today, picked for your reading identity — <em>{archetypeName}</em>.
        Long version of each is one click away. Skip what you like.
      </p>

      {/* Stories */}
      {stories.map((s, i) => (
        <article key={s.topicId + i} className="mb-7 pb-7" style={{ borderBottom: i < stories.length - 1 ? `1px solid ${NEWS_RULE}` : 'none' }}>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="font-display italic flex-shrink-0" style={{
              color: ACCENT, fontSize: 28, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.024em',
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{
              fontFamily: 'var(--font-mono), monospace', color: ACCENT,
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase',
            }}>{s.category} &middot; {s.readTime}</span>
          </div>
          <img src={s.image} alt="" style={{
            width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 4, marginBottom: 14, display: 'block',
          }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <h2 className="font-display" style={{
            color: NEWS_INK, fontSize: 22, fontWeight: 600, lineHeight: 1.16, letterSpacing: '-0.02em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 30",
            marginBottom: 10, textWrap: 'balance',
          }}>{s.title}</h2>
          <p style={{
            color: NEWS_SUB, fontSize: 15, lineHeight: 1.6, marginBottom: 12,
            fontVariationSettings: "'opsz' 14, 'SOFT' 50",
          }}>{s.summary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <a href="#" style={{
              color: ACCENT, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em',
              borderBottom: `1px solid ${ACCENT}`, fontFamily: 'var(--font-mono), monospace',
              textTransform: 'uppercase',
            }}>Read the full piece &rarr;</a>
            <span style={{ color: NEWS_MUTED, fontSize: 12 }}>&middot;</span>
            <span style={{ color: NEWS_MUTED, fontSize: 12 }}>via {s.source}</span>
          </div>
        </article>
      ))}

      {/* Footer */}
      <div className="text-center pt-6 mt-2" style={{ borderTop: `1px solid ${NEWS_RULE}` }}>
        <p className="italic mb-3" style={{
          color: NEWS_SUB, fontSize: 14, lineHeight: 1.5,
          fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        }}>That&rsquo;s it for today. The next one is at {slot.time}, every morning.</p>
        <p style={{
          fontFamily: 'var(--font-mono), monospace', color: NEWS_MUTED,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', marginBottom: 4,
        }}>
          Rig Wire &middot; built for {name || 'you'} ({email})
        </p>
        <p style={{ fontSize: 11, color: NEWS_MUTED }}>
          <a href="#" style={{ color: NEWS_MUTED, textDecoration: 'underline' }}>Unsubscribe</a>{' · '}
          <a href="#" style={{ color: NEWS_MUTED, textDecoration: 'underline' }}>Update preferences</a>{' · '}
          <a href="#" style={{ color: NEWS_MUTED, textDecoration: 'underline' }}>Forward to a friend</a>
        </p>
      </div>
    </div>
  );
}
