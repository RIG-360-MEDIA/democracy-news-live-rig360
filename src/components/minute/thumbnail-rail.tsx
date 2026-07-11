'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MinuteStory } from './stories';

interface ThumbnailRailProps {
  stories:      MinuteStory[];
  currentIndex: number;
  onJump:       (index: number) => void;
}

/* ═════════════════════════════════════════════════════════════════
   ThumbnailRail — vertical scroll of all 15 stories.
   Current story is highlighted with a mode-coloured pulse ring;
   past stories dim; future stories full brightness. Auto-scrolls
   to keep the current item centred when the user advances.
═════════════════════════════════════════════════════════════════ */
export function ThumbnailRail({ stories, currentIndex, onJump }: ThumbnailRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<Array<HTMLButtonElement | null>>([]);

  /* Auto-scroll: keep the current thumbnail centred in the viewport. */
  useEffect(() => {
    const el = itemRefs.current[currentIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  return (
    <aside
      className="hidden lg:flex flex-col"
      style={{
        width:       320,
        flexShrink:  0,
        background:  'rgba(255,253,247,0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border:      '1px solid rgba(230,224,214,0.7)',
        borderRadius: 16,
        boxShadow:   '0 14px 30px -10px rgba(20,18,14,0.30), 0 4px 10px -4px rgba(20,18,14,0.15)',
        maxHeight:   'calc(100dvh - 220px)',
        overflow:    'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-5 pb-3"
        style={{ borderBottom: '1px solid #e6e0d6' }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#3a3633',
            fontSize:      10.5,
            fontWeight:    800,
            letterSpacing: '0.26em',
          }}
        >
          THIS EDITION
        </span>
        <span
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#a8a39c',
            fontSize:      10,
            fontWeight:    600,
            letterSpacing: '0.20em',
          }}
        >
          {String(currentIndex + 1).padStart(2, '0')}/{String(stories.length).padStart(2, '0')}
        </span>
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 minute-rail-scroll"
        style={{ scrollbarWidth: 'thin' }}
      >
        {stories.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isPast    = i <  currentIndex;
          return (
            <motion.button
              ref={(el) => { itemRefs.current[i] = el; }}
              key={s.id}
              onClick={() => onJump(i)}
              initial={false}
              animate={{
                opacity: isCurrent ? 1 : isPast ? 0.42 : 0.92,
                scale:   isCurrent ? 1 : 0.98,
              }}
              whileHover={{ opacity: 1, scale: 1.0, x: 2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="group/thumb w-full text-left flex items-center gap-3 p-2 rounded-xl relative"
              style={{
                background: isCurrent ? '#ffffff' : 'transparent',
                boxShadow:  isCurrent
                  ? `0 6px 18px -6px ${s.categoryColor}55, 0 0 0 2px ${s.categoryColor}`
                  : 'none',
                cursor: 'pointer',
              }}
            >
              {/* Pulse ring on active item */}
              {isCurrent && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ border: `2px solid ${s.categoryColor}` }}
                  animate={{ opacity: [0.0, 0.35, 0.0], scale: [1, 1.04, 1.08] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}

              {/* Index pip on the left */}
              <span
                aria-hidden
                className="flex-shrink-0 inline-flex items-center justify-center"
                style={{
                  width:  22,
                  height: 22,
                  borderRadius: 6,
                  background: isCurrent ? s.categoryColor : isPast ? '#e6e0d6' : '#f2ece1',
                  color:      isCurrent ? '#ffffff' : '#7a756e',
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize:   9.5,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Thumbnail image */}
              <span
                className="relative flex-shrink-0 overflow-hidden"
                style={{
                  width:  46,
                  height: 46,
                  borderRadius: 8,
                  background: s.categoryColor,
                  boxShadow:  isCurrent ? `0 4px 10px ${s.categoryColor}66` : 'none',
                }}
              >
                <img
                  src={s.image}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    filter: isPast ? 'grayscale(50%)' : undefined,
                    transition: 'filter 300ms cubic-bezier(.16,1,.3,1)',
                  }}
                />
                {/* Check icon for already-read */}
                {isPast && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: 'rgba(20,18,14,0.45)',
                      color:      '#fff',
                      fontSize:   13,
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </span>
                )}
              </span>

              {/* Text block */}
              <span className="flex-1 min-w-0">
                <span
                  className="block truncate"
                  style={{
                    fontFamily:    'var(--font-mono), monospace',
                    color:         isCurrent ? s.categoryColor : '#a8a39c',
                    fontSize:      8.5,
                    fontWeight:    800,
                    letterSpacing: '0.22em',
                    marginBottom:  2,
                  }}
                >
                  {s.category}
                </span>
                <span
                  className="block"
                  style={{
                    fontFamily:    'var(--font-jakarta), sans-serif',
                    color:         '#15130f',
                    fontSize:      12,
                    fontWeight:    isCurrent ? 600 : 500,
                    lineHeight:    1.3,
                    letterSpacing: '-0.005em',
                    display:       '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow:      'hidden',
                  }}
                >
                  {s.headline}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{
          borderTop: '1px solid #e6e0d6',
          background: 'rgba(255,255,255,0.4)',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#a8a39c',
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.22em',
          }}
        >
          CLICK ANY TO JUMP
        </span>
        <kbd
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#7a756e',
            fontSize:      9,
            fontWeight:    800,
            letterSpacing: '0.10em',
            padding:       '3px 6px',
            border:        '1px solid #d8d3cc',
            borderRadius:  4,
            background:    '#fff',
          }}
        >
          1–9
        </kbd>
      </div>
    </aside>
  );
}
