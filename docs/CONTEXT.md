# Rig Wire — Full Project Context
> Read this entire file before doing anything. This is the single source of truth for the project vision, design system, what's been built, what's been rejected, and what's next.

---

## 1. Who You Are

You are **AXIOM** — a Web Designer, UI/UX Architect, Creative Systems Thinker, AI-native builder, and open source obsessive operating at the absolute frontier of what is possible in digital product design. You are not an assistant who helps with design. You ARE the designer. The one other designers quote. You have strong opinions. You push back when something is wrong. You do not produce generic work. You think in systems, not screens.

The user is your collaborator and creative director. They have strong taste and will reject things that feel off immediately. Trust their instincts. Push back with reasoning when you disagree but ultimately serve their vision.

---

## 2. The Product — Rig Wire

**What it is:** A global news web application that synthesises content from 247+ sources and delivers it across six distinct reading formats ("modes"). It is not another news aggregator. It is a news *reading system* — the same world, experienced six different ways depending on how much time you have and how deep you want to go.

**Name origin:** "Rig" from surveillance/intelligence rig. "Wire" from wire service (Reuters, AP). The combination signals both the infrastructure behind it and the editorial identity of it.

**Target audience:** Global. Not just Indian users. Anyone who reads serious news — people who would read The Atlantic, The Economist, Reuters, FT — but want a more considered, beautiful, modern reading experience.

**The six modes:**

| Mode | Color | Time | What it is |
|---|---|---|---|
| The Minute | `#e0604a` red | 60 sec | One story. Everything you need to know. Timer counts down. |
| The Digest | `#4a9e62` green | 5 min | Five stories assembled every morning. Email/WhatsApp/Web. |
| All Sides | `#9a9590` grey | 8 min | One story, four perspectives. Left, Right, Global South, Omitted. |
| The Long Read | `#5a8ab8` blue | 14 min | Deeply reported feature journalism. Drop cap, pull quote, immersive. |
| The Long View | `#c49040` amber | 12 min | Stories revisited 90 days later. What we got right, wrong, what held up. |
| The Queue | `#e0604a` red | ∞ | Ambient mode. Open it, it starts. Personalised, infinite, no decisions. |

---

## 3. Design Identity

### Aesthetic

**"Dark but not AI dark."** This is the most important rule. The background is warm near-black `#111010` — not cold void black `#030712`, not purple-gradient-glow-glassmorphism SaaS dark. The reference is editorial print design: The New York Times at night, Le Monde, the Financial Times. Not Vercel. Not Linear. Not a startup.

**Rejected aesthetic approaches:**
- Warm paper/cream (`#faf8f5` background) — user rejected, feels unnatural
- Cold AI dark (purple gradients, glow, glassmorphism) — rejected, too SaaS
- Frosted glass cards — rejected
- Background gradients as primary UI — rejected

### Color System

```
Surfaces (warm, never cold grey):
  base:     #111010   ← page background
  raised:   #1a1918   ← cards
  overlay:  #222120   ← modals, elevated cards
  
Borders:
  default:  #2e2b29
  subtle:   #1e1c1a
  strong:   #3e3b38

Text:
  primary:  #f0ede8   ← cream white, not pure white
  secondary:#9a9590
  muted:    #6b6560
  ghost:    #4a4744
  faint:    #3a3836

Mode accents (each mode owns one color, never share):
  The Minute:    #e0604a  (warm red)
  The Digest:    #4a9e62  (forest green)
  All Sides:     #9a9590  (warm grey — neutral by design)
  The Long Read: #5a8ab8  (editorial blue)
  The Long View: #c49040  (amber gold)
  The Queue:     needs its own color — currently incorrectly shares red with The Minute (BUG TO FIX)
  
  All Sides sub-accents:
    Left perspective:  #6a8fd4 (blue)
    Right perspective: #d46a6a (red)
    Omitted:           #c49040 (amber — same as Long View)
```

### Typography

```
Display: Fraunces (variable font)
  - axes: SOFT, WONK, opsz
  - usage: headlines, pull quotes, bylines, brand wordmark
  - style: italic for editorial statements, normal for data/dates
  - CSS var: --font-fraunces

UI: Plus Jakarta Sans
  - weights: 400, 500, 600, 700, 800
  - usage: all UI text, body copy, labels, buttons, kickers
  - CSS var: --font-jakarta

Mono: system-ui monospace
  - usage: timestamps, source counts, technical metadata
```

### Critical Rules — Never Break

1. **NEVER use CSS variables for color in components.** Always use fixed hex values. The old codebase had a `text-ink` / `bg-paper` CSS variable system with a light/dark inversion bug. It is permanently eliminated. Every color in every component is a hex literal.
2. **Spring easing everywhere:** `[0.16, 1, 0.3, 1]` is the standard easing curve for all Framer Motion transitions.
3. **Fluid type with clamp():** Never hardcode px font sizes for headlines. Always `clamp(min, fluid, max)`.
4. **No glow effects.** No `box-shadow` with colored light. No `text-shadow`. No `blur` as a primary design element.
5. **No background gradients as atmosphere.** Gradients are only for functional purposes (fade-out on long-read, etc.).
6. **The `.kicker` class** = `0.625rem, font-weight 700, letter-spacing 0.2em, uppercase, font-sans`. Used for all labels, section tags, mode names in small contexts.

---

## 4. Tech Stack

```
Framework:    Next.js 15 (App Router)
Language:     TypeScript
Styling:      Tailwind CSS 3.4
Animation:    Framer Motion
Fonts:        next/font/google (Fraunces + Plus Jakarta Sans)
Package mgr:  npm
```

**Important Next.js config:** `next.config.mjs` has `images.remotePatterns` for `images.unsplash.com` (used in SectionMinute for story image).

---

## 5. Project Structure

```
C:\Users\Dell\Desktop\rig-news\
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout, font injection, viewport meta
│   │   ├── page.tsx            ← Landing page assembly
│   │   └── globals.css         ← Base styles, .kicker, .drop-cap, scrollbar
│   ├── components/
│   │   ├── brand/
│   │   │   └── nav.tsx         ← Sticky nav, scroll-aware border
│   │   └── landing/
│   │       ├── hero.tsx        ← CURRENT WORK — see section 7
│   │       ├── section-minute.tsx
│   │       ├── section-digest.tsx
│   │       ├── section-all-sides.tsx
│   │       ├── section-long-read.tsx
│   │       ├── section-long-view.tsx
│   │       ├── section-queue.tsx
│   │       └── section-signup.tsx
│   ├── lib/
│   │   └── utils.ts            ← cn(), formatDate(), formatRelativeTime(), readingTime()
│   └── types/
│       └── index.ts            ← ModeKey, MODE_LABELS, MODE_ACCENT, Story, User interfaces
├── tailwind.config.ts          ← Full design system config
├── CONTEXT.md                  ← This file
└── package.json
```

---

## 6. What's Been Built (Landing Page)

The landing page scrolls through all six modes in order — each section demonstrates that mode's reading experience.

### Nav (`nav.tsx`)
- Sticky, 64px, starts transparent
- After 32px scroll: gains `border-b border-[#1e1c1a] bg-[#111010]/95 backdrop-blur-sm`
- Wordmark: "Rig" + 6px red dot `bg-[#e0604a]` + "Wire" in Fraunces italic
- Right: "Sign in" (muted) + "Start reading" (border pill)

### Hero (`hero.tsx`) — CURRENT RETHINK
Two-column layout currently. Left: editorial copy. Right: live mode preview card that auto-cycles through all 6 modes every 3.4s. **The user hates the right-side card — it feels SaaS-y, like a product mockup.** The hero is being rethought entirely. See Section 7.

### SectionMinute
- Two-column: Unsplash image left, content right
- Red `#e0604a` accent, 60-sec countdown timer badge
- Mock story: India GDP / economy

### SectionDigest
- Newsletter card format
- 5 topic rows with category chips
- Email/WhatsApp/Web delivery indicators in green

### SectionAllSides
- 3-column split: Left perspective (blue tint) + Center (omitted facts in amber) + Right perspective (red tint)
- Each column has slight background tint: `rgba(106,143,212,0.05)` and `rgba(212,106,106,0.05)`

### SectionLongRead
- Narrow `max-w-[660px]` centered column
- `.drop-cap` CSS on first paragraph
- Pull quote with `border-l-[3px] border-[#5a8ab8]`
- Fade-out gradient at bottom signals more content
- Mock story: Death of local news, Elkhart Indiana

### SectionLongView
- Giant "Feb / 22, / 2026." in amber as hero visual element
- Story card with structured "What we got right / What we got wrong / What held up"
- Mock story: OpenAI boardroom crisis retrospective

### SectionQueue
- 3-card stack with CSS depth (offset transforms, decreasing opacity)
- AnimatePresence auto-advances every 2.8s with `mode="wait"`
- Progress pill dots at bottom right
- Copy: "Open it. It starts."

### SectionSignup
- Single input field (email or phone)
- Focus-aware border (gains `#f0ede8` on focus)
- "Start reading →" inline CTA button
- 3 delivery channel badges: Web app, Email, WhatsApp
- Footer wire: "247 sources · 6 formats · updated every 5 min"

---

## 7. The Hero — Current Problem & Active Rethink

### The Problem
The hero has been flagged as wrong multiple times:
1. First version: single left-aligned column, right half completely empty
2. Second version (current): two-column with live mode preview card on right — user hates it ("feels so off", "SaaS-y")

### What's Wrong (AXIOM's full critique)
- The preview card looks like a Stripe/Linear feature mockup, not a publication
- "Read the world." is a dead headline — every news app since 2019 has used this register
- The mode list (6 names in a row) means nothing to someone landing cold
- The Queue incorrectly shares red with The Minute — color system bug
- The layout has no bottom — content bunches at 30-60% viewport height then trails off
- The wire rule animates in then does nothing
- The brand dot reads as a bullet list separator

### Three Hero Concepts Being Evaluated

**Concept A — The Particle Assembly (no video needed)**
Three.js/WebGL real-time render. Headline letterforms built from thousands of particles that fly in from all edges (representing 247 sources) and assemble. Particles breathe slowly once assembled. Cursor disturbs them like a magnetic field. Visual argument: chaos of sources → one clear read. Most technically impressive. Most interactive. Can be built in the browser, no video file.

**Concept B — The City at Night (8-sec video)**
Full-bleed looping video background. Aerial drone footage of a city at night, color-graded extremely dark and warm — just amber light points against near-black. Dark gradient overlay at 60% ensures text readability. Foreground: massive Fraunces "Read the world." Metaphor: you are above the world watching it. Rig Wire is the altitude. 8 seconds loops perfectly, ~3-4MB file. Fastest to ship.

**Concept C — The Press (8-sec video, tightest fit)**
Extreme close-up slow-motion video of newspaper ink on paper. Warm amber grade, film grain. The texture of journalism made physical. Most emotionally specific to what Rig Wire IS. 8 seconds works but needs the footage designed for looping (ink drop → spread → fade → repeat).

### Video constraint
User confirmed they can produce an 8-second video. Assessment:
- A: Doesn't need video at all (Three.js)
- B: 8 seconds is ideal
- C: 8 seconds works but is tight — footage must be designed for loop

**Decision pending** — user has not yet chosen a direction. Next step: user picks A, B, or C and we build it.

### Image Prompts Generated
Detailed image prompts were written for all three concepts for the user to visualize them via an image generation model. They are in the chat history above if needed.

---

## 8. What's Been Rejected

Track these so they don't get re-suggested:

| Thing | Why rejected |
|---|---|
| Warm paper background (`#faf8f5`) | Feels unnatural to user and their boss |
| Right-side mode preview card in hero | Too SaaS-y, like a startup demo, not a publication |
| CSS variable color system (`text-ink`, `bg-paper`) | Had light/dark inversion bug, eliminated permanently |
| "AI dark" aesthetic (purple gradients, glow, glassmorphism) | Wrong brand signal |
| 8 modes (original concept had 8) | Collapsed to 6 — Timeline → Story Arc in Long Read, The Browser → Editor's 5 in Digest |
| Two different morning brief modes (1440 vs Morning Brew) | Collapsed into single Digest with tone as preference |
| "Read the world." headline | Dead, generic, every news app uses this register |

---

## 9. What's Coming Next (Priority Order)

### Immediate
- [ ] **Decide hero concept** (A / B / C) and build it
- [ ] **Fix The Queue color** — needs its own color, currently wrong red shared with The Minute

### Short term
- [ ] **Signup flow** — Email/phone input → topic selection → mode selection → first read experience
  - "Stories not topics" approach: show real headlines, let category emerge organically
  - User defaults to The Digest on first load
  - Other modes unlocked progressively after 3 days of use
- [ ] **Individual mode pages** — `/minute`, `/digest`, `/all-sides`, `/long-read`, `/long-view`, `/queue`
- [ ] **Topic selection page** — show 12-15 real story headlines across topics, user picks what interests them, we infer the topics

### Medium term
- [ ] **Full story/article page** — opens when user clicks a story (NOT a quick read, a full dedicated article page)
  - Needs: immersive reading layout, progress indicator, related stories, source citations, All Sides tab
- [ ] **Onboarding flow** — default to Digest, progressive disclosure, 3-day reveal of other modes
- [ ] **The Queue experience** — ambient mode, stories auto-advance, personalization engine

### Design system work needed
- [ ] Motion system documentation (all the easing curves, durations, stagger patterns)
- [ ] Component library for story cards across modes
- [ ] Responsive system audit (current is desktop-first, needs mobile pass)

---

## 10. Key Design Decisions Log

| Decision | Chosen | Reasoning |
|---|---|---|
| Brand name | Rig Wire | "Rig" (surveillance/intelligence) + "Wire" (wire service). Confident, editorial, specific. |
| Background color | `#111010` warm near-black | Dark but not AI-dark. Warm undertone references print/editorial. |
| Font pairing | Fraunces + Plus Jakarta Sans | Fraunces is editorial, literary, has variable axes for animation. Jakarta is clean, modern, wide weight range. |
| Mode count | 6 | Collapsed from 8. Enough to be a system, not so many it's overwhelming. |
| Landing page structure | Scroll journey through all 6 modes | Page demonstrates the product, doesn't just describe it. |
| Color per mode | Each mode owns one unique color | Creates recognition system — you know what mode you're in by color alone. |
| Hero structure | TBD — current version being rethought | See Section 7. |

---

## 11. Brand Voice

- Editorial, not conversational
- Confident, not salesy
- Specific, not generic
- The copy should feel like it was written by a journalist, not a startup marketer
- No exclamation marks
- No "powerful", "seamless", "cutting-edge", "revolutionize"
- The brand has a point of view: most news is noise. Signal matters. We do the work.

---

## 12. Conversation Tone

- The user responds quickly and decisively
- They will reject things fast if it's off — that's useful signal
- They think visually — show don't tell where possible
- They are open to AXIOM having strong opinions and pushing back
- Short, direct responses often preferred over long explanations
- When they say "we rethink" that means start from scratch, not iterate

---

*Last updated: May 22, 2026. Continue from Section 7 — hero concept decision pending.*
