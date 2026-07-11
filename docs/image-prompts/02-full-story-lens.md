# Image Generation Prompt — Full Story Lens (`/app/full-story`)

> Paste into Imagen 3 / GPT-4o image gen / Ideogram 2.0 for best text fidelity.
> Midjourney v6 users: append `--ar 16:9 --style raw --v 6 --s 250 --no wireframe,template`

---

## THE PROMPT

```
ULTRA-HIGH-FIDELITY DESKTOP WEBAPP SCREENSHOT MOCKUP — 1440x900 viewport

PRODUCT: "RIG·news" Full Story lens at URL "rignews.com/app/full-story"
— the Medium-style longform discovery hub. User clicked the "Full Story"
tile from the lens picker and landed here to scan articles available in
slow-read format. The experience must look indistinguishable from
Medium.com mixed with Stratechery and The Atlantic.

OVERALL AESTHETIC: Medium.com homepage circa 2024 × Stratechery × The
Atlantic editorial section × Substack featured page. Pure white
canvas, serif-dominant typography, generous whitespace, dense but
breathable information hierarchy. Looks like a real shipped editorial
product designed by Pentagram or Order — NOT a wireframe, NOT a
template, NOT a SaaS landing page.

──────────────────────────────────────────────────────────────────────
BROWSER FRAME (subtle, top edge):
- macOS window controls (red/yellow/green 12px dots) top-left
- URL bar reading "rignews.com/app/full-story" in light gray monospace
- Browser chrome background: neutral dark gray #2a2a2a, 32px tall

──────────────────────────────────────────────────────────────────────
SECTION 1 — TOP CHROME BAR (56px tall, sticky white)
- Background: pure white #FFFFFF
- Bottom border: 1px solid #E8E8E4 (hairline gray)
- LEFT (16px from edge): "× Back to lenses" — Inter 13px medium weight,
  near-black #0c0c0e, with a small × icon (14px stroke 2) preceding
- CENTER: "RIG·news" wordmark, smaller version (logo size sm), with
  RIG in muted olive-green #5A7800 (NOT chartreuse on this page),
  middot in olive-green, "news" in italic semibold near-black
- RIGHT (16px from edge): icon + label group:
  📖 BookOpen icon 14px in olive-green stroke 1.8, then "Full Story"
  in Inter 12px semibold near-black, then a dim gray "·" separator,
  then "23 stories today" in JetBrains Mono 11px uppercase 0.14em
  letter-spacing color #6e6e72

──────────────────────────────────────────────────────────────────────
SECTION 2 — PAGE HERO (~360px tall, max-width 1100px centered):
- Padding: 80px top, 48px bottom
- TINY KICKER LABEL at top: "THE SLOW LENS · INSPIRED BY MEDIUM-STYLE
  LONGREADS" in Inter 11px semibold uppercase 0.16em letter-spacing
  color medium gray #828286, 24px below the chrome bar
- 32px gap
- MASSIVE TITLE: "Full Story." rendered in Fraunces 300 weight italic,
  120px size, leading 0.9, tracking -0.035em, color near-black
  #0c0c0e, with the period in regular (non-italic) for editorial
  punch
- 28px gap
- ITALIC SUBTITLE in two lines: "Stories that deserve your time. /
  Serif type. Drop caps. Cited paragraph by paragraph." rendered in
  Fraunces 300 italic, 28px size, color medium gray #4a4a4e, leading
  1.25, max-width 720px
- 32px gap
- STATS STRIP at bottom of hero in a single row, separated by middots:
  "23 STORIES" + middot + "4H 12M OF READING" + middot + "UPDATED 8
  MIN AGO" — all in JetBrains Mono 11px uppercase 0.16em
  letter-spacing color medium gray #828286, with the second item
  (reading time) emphasized in near-black
- Horizontal rule below the entire hero: 1px solid #E8E8E4 spanning
  full max-width

──────────────────────────────────────────────────────────────────────
SECTION 3 — FEATURED STORY (~480px tall, full max-width 1100px):
- TINY KICKER at top-left: "FEATURED EDITORIAL · TODAY" in Inter 11px
  semibold uppercase 0.14em color olive-green #5A7800
- 16px gap
- LAYOUT: 12-column grid
  - LEFT (cols 1-7, ~640px): editorial content
  - RIGHT (cols 8-12, ~440px): hero photograph
  - 48px gap between
- LEFT SIDE content:
  - Topic kicker label "INDIA · POLITICS" in Inter 11px semibold
    uppercase 0.14em color #6e6e72 with a small 8x8 colored dot
    (saffron orange #fb923c) preceding it
  - 24px gap
  - MASSIVE HEADLINE: "Telangana's cabinet reshuffle: power moves
    before 2027" rendered in Fraunces 500 weight, 56px size, leading
    1.05, tracking -0.022em, color near-black, max 3 lines
  - 24px gap
  - ITALIC SUBTITLE: "Five ministers dropped. Three new MLAs inducted.
    The first major reshuffle of Revanth Reddy's government — six
    months overdue, signaling a sharper Congress posture before 2027
    elections." in Fraunces 300 italic, 21px size, leading 1.4, color
    medium gray #4a4a4e, max-width 580px
  - 32px gap
  - BYLINE ROW: small circular author avatar 32px diameter (with
    Indian face/illustration), 12px gap, "by RIG·news Editorial" in
    Inter 14px medium color near-black, then ·, then "May 21, 2026"
    in Inter 14px color medium gray, then ·, then "9 min read" in
    Inter 14px color medium gray
  - 24px gap
  - BOTTOM ACTION ROW: a small olive-green "Save" pill button (Inter
    12px medium, white text, #5A7800 bg, rounded-full, 12px x 6px
    padding) on left, then claps "👏 47" in Inter 12px color medium
    gray, then "23 sources · 6 formats" mono pill
- RIGHT SIDE photograph:
  - Aspect ratio 4:5 portrait, ~360px wide × 450px tall
  - Subtle 1px gray border #E8E8E4
  - Photograph: cinematic shot of an Indian political press conference
    or cabinet meeting — dignitaries in formal attire seated at a long
    table draped in cream linen, microphone stands, warm tungsten
    lighting, photojournalistic Reuters-style, slight grain, full
    color (not desaturated)
  - Tiny photo credit overlay bottom-right: "Photo · Reuters" in
    white 10px Inter 50% opacity

- Horizontal rule below entire featured section: 1px solid #E8E8E4

──────────────────────────────────────────────────────────────────────
SECTION 4 — ARTICLE FEED (the main list, vertical stack):
- TINY KICKER: "MORE STORIES · CURATED" in Inter 11px semibold uppercase
  0.14em color #6e6e72, 32px below the rule
- 24px gap
- Each article row: 12-column grid, ~180px tall, padded 32px vertical
  - LEFT (cols 1-8): editorial text
  - RIGHT (cols 9-12): thumbnail photograph

Row structure (REPEAT 5-6 ROWS, varying topics & photos):

  - Topic kicker at top: "FINANCE · MARKETS" in Inter 11px semibold
    uppercase 0.14em color #6e6e72 with small 6x6 colored dot
    (emerald #34a853 for Finance)
  - 12px gap
  - HEADLINE in Fraunces 500 weight, 30px size, leading 1.1, tracking
    -0.015em, color near-black, max 2 lines: "RBI holds rates steady,
    signals patience on inflation"
  - 8px gap
  - ITALIC SUBTITLE in Fraunces 300 italic, 17px, leading 1.45, color
    medium gray #5a5a5e, max 2 lines: "Sixth straight quarter of
    unchanged policy rates. Governor cited core inflation stickiness
    despite headline cooling. Markets price in possible cut by Q3."
  - 16px gap
  - BOTTOM META ROW: avatar (24px circle) + "RIG·news Staff · May 21
    · 11 min read · 17 sources" in Inter 13px color medium gray
    #6e6e72, with "Save" tiny icon (bookmark icon 14px gray) at far
    right + "···" overflow icon

  - RIGHT THUMBNAIL: 5:4 ratio, ~220px wide × 175px tall, subtle 1px
    border, real news photography related to the topic (RBI building,
    market terminal, tech office, cricket stadium, etc.)

- Hairline 1px #E8E8E4 divider between each row

VARY THE 5-6 ROWS:
  Row 1: Finance — RBI holds rates (emerald kicker dot, RBI building
         photo)
  Row 2: World/Diaspora — US tightens H-1B rules (blue kicker dot,
         airport boarding gate photo)
  Row 3: Tech — Chandrayaan-4 launch window set (sky-blue kicker dot,
         rocket photo)
  Row 4: Karnataka — Bengaluru water crisis worsens (red kicker dot,
         dry tank or pipes photo)
  Row 5: Sports — IPL final draws record viewership (orange kicker
         dot, cricket stadium photo)
  Row 6: Climate — Telangana paddy yield drops 15% (green kicker dot,
         farmer in field photo)

──────────────────────────────────────────────────────────────────────
SECTION 5 — EDITORIAL FOOTNOTE (~80px tall, before footer):
- Centered single-line in light gray italic Fraunces 16px:
  "Composed from 247 real news sources. Edited by humans. No invented
  quotes, no fabricated numbers."
- Below: tiny "READ THE METHODOLOGY →" link in Inter 11px uppercase
  0.16em letter-spacing color olive-green #5A7800

──────────────────────────────────────────────────────────────────────
GLOBAL VISUAL TREATMENT — PURE EDITORIAL WHITE:

COLORS (exact hex):
- Background: #FFFFFF (pure white, no off-white)
- Card/section backgrounds: same white, separated only by hairline
  rules
- Text primary: #0c0c0e (near-black, NOT pure black)
- Text secondary: #4a4a4e (dark gray for subtitles)
- Text muted: #6e6e72 (medium gray for metadata)
- Text faint: #a8a8ac (light gray for photo credits)
- Hairline rules: #E8E8E4
- Medium-green accent: #5A7800 (used VERY sparingly — only on
  "Save" pills, brand wordmark, "Read methodology" link)
- Topic dots: orange #fb923c, emerald #34a853, blue #60a5fa,
  sky #38bdf8, red #f87171, green #4ade80, fuchsia #e879f9

TYPOGRAPHY (exact specs):
- Display headlines: Fraunces variable serif, weight 300-600,
  italic for emphasis/subtitles, regular for bold headlines
- UI text / kickers / bylines: Inter sans, weights 400-600,
  letter-spacing 0.14-0.16em for kickers
- Metadata stats: JetBrains Mono, weight 400, 11px uppercase

PHOTOGRAPHY:
- All photographs are REAL photojournalistic imagery (Reuters/AP/
  Getty style), NOT abstract shapes, NOT stock business photos
- Full color (not desaturated like the Quick Read lens)
- Subtle 1px borders #E8E8E4
- 4px border radius (very subtle)
- Real Indian news context: politicians, cityscapes, markets,
  cricket, ISRO launches, farmers

WHITESPACE:
- Generous editorial whitespace — Medium's signature trait
- 32-48px vertical gaps between sections
- 24-32px gaps within sections
- Padding inside elements: 16-32px

INTERACTIONS HINTED:
- One article row in the feed shown in hover state: very faint #FAFAFA
  background tint, headline color slightly darker, image fully
  saturated
- A small "1/8" scroll-position indicator hint at very bottom-right
  of viewport in tiny mono text

──────────────────────────────────────────────────────────────────────

REJECT THESE FAILURE MODES:
- ❌ Dark mode rendering (this page is ALWAYS pure white)
- ❌ Chartreuse #e4ff00 accent anywhere (that's brand, not this lens)
- ❌ Uniform card grid of identical sizes (must be 1 featured + list)
- ❌ Stock business photography (politicians in suits stock photo
   style) — needs to be photojournalistic
- ❌ Generic blog template layout with sidebar widgets
- ❌ Centered narrow column for the LIST (the LIST goes wide; only
   reading view goes narrow)
- ❌ Medium green used as primary brand color (it's ONLY an accent
   on save/methodology)
- ❌ Sans-serif headlines (must be serif Fraunces)
- ❌ Lorem ipsum — every word must be real-feeling news content
- ❌ Cards with shadows, borders, "elevation" effects — Medium uses
   only hairline dividers, no card containers

FINAL OUTPUT:
- Single cohesive 1440x900 screenshot of the page
- Photo-realistic detail, sharp typography, no rendering artifacts
- Looks EXACTLY like a real screenshot of a shipped premium product
  on a designer's display
- Premium editorial feel: Medium.com + Stratechery + The Atlantic
  + a hint of Substack featured section
```

---

## TOOL-SPECIFIC TWEAKS

| Tool | Notes |
|---|---|
| **Imagen 3 (Gemini)** | Paste as-is. Best text fidelity for serif typography. |
| **GPT-4o image gen** | Excellent at hierarchy and editorial layouts. Paste as-is. |
| **Ideogram 2.0** | Best at legible UI text. Use "Magic Prompt OFF". |
| **Midjourney v6** | Append `--ar 16:9 --style raw --v 6 --s 250 --no wireframe,template,bootstrap,sidebar` |
| **Recraft v3** | Use "raster image" + UI/UX preset |

---

## WHAT TO LOOK FOR IN THE RESULT

1. **Pure white background** — NOT off-white, NOT light gray
2. **HUGE italic Fraunces "Full Story."** in the hero (~120px)
3. **Featured story with serif 56px headline + italic subtitle + author byline**
4. **Vertical list of 5-6 article rows**, each with text-left + thumbnail-right
5. **Real photojournalistic imagery**, not stock or abstract
6. **Hairline dividers** between articles, NO card shadows
7. **Olive-green accents** on Save/methodology only (NOT chartreuse)
8. **Generous whitespace** — Medium's signature trait

---

## NEXT STEP

After you generate the image, send it back. I'll match the code to whatever the AI produces.
