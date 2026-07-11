# Rig Wire — Card Illustration Brief

Six illustration plates, one per mode. Generated via Midjourney v7, DALL·E 3,
or Stable Diffusion XL. Style is shared across all six so the cards read as
one editorial family. Plates contain **NO TEXT** — wordmarks, labels, and
typography are composited in code over the image.

---

## Workflow

1. Paste each prompt into your tool of choice.
2. Roll a few options; pick the best per mode.
3. Save final images to `/public/cards/` with the filenames listed.
4. Recommended format: **WebP** (smaller, sharper). PNG fallback fine.
5. Recommended dimensions: **1500 × 1000** (3:2 aspect, retina-ready).
6. Tell me when all six are in place — I'll wire them into the cards.

---

## Style Preamble — paste this in front of every prompt

```
Editorial still-life illustration plate. Studio-shot, large-format film
aesthetic, 35mm Kodak Portra 400 grain, soft directional warm tungsten
lighting from upper left, subtle shadow falloff to lower right. Centered
hero subject occupying ~55% of frame, generous negative space around it for
later text composition. Background paper has visible fibre texture and a
gentle vignette toward the edges. Hyper-tactile, materially specific —
viewer should feel they could touch every surface. References: Wes Anderson
production still lifes, Tom Sachs material studies, vintage Encyclopaedia
Britannica plates, Wallpaper magazine product photography.

NEGATIVE: no text, no letters, no numbers, no words, no logos, no brands,
no faces, no people, no modern UI, no digital screens, no neon, no glow,
no chromatic aberration.

Aspect ratio --ar 3:2 --q 2 --style raw
```

---

## 1 · The Minute — `minute.webp`

```
A single aged brass disc, ~60% of frame, lying flat on warm peach linen.
Inside the disc: an exposed pocket-watch movement — fine brass gears,
jewelled pivots, escapement wheel, balance spring, etched in microscopic
detail. Visible patina, fingerprint smudges, faint verdigris-green
oxidation in recesses. Scattered around the disc: a few tiny brass
shavings, one loose screw, the tip of jeweller's tweezers half in frame
from upper-right. Background: warm peach #fcded0 woven linen with soft
shadow beneath the disc.

Mood: precision mechanical time made physical.
Colour: peach base, deep oxidised brass, hints of verdigris, warm shadow.
```

---

## 2 · The Digest — `digest.webp`

```
A delicate organic mycelial network spreading across pale mint paper.
Fine branching threads in soft sage and deep forest green, forking and
intersecting at small organic nodes. Five distinct nodes slightly more
pronounced than the rest, arranged in a loose pentagonal pattern, with
a sixth larger node at the centre. Threads have a faint micro-glow at
the joins, like backlit roots. Background: pale mint #d6e8dc paper
with a subtle wash of botanical-illustration ink beneath the surface.

Mood: organic information network, biological intelligence.
Colour: mint base, sage and forest green threads, faint mycelial
luminescence at nodes.
```

---

## 3 · All Sides — `all-sides.webp`

```
Four translucent etched-glass panels arranged in an exploded isometric
view, floating slightly apart at converging angles toward a central
focal point. Each panel has fine etched geometric line work — different
patterns per panel (one map-like, one architectural, one geological,
one astronomical). Each panel carries a subtle colour tint: one cool
slate blue, one warm vermillion, one forest green, one amber. Visible
micro-fractures and dust motes catching light between the panels.
Background: warm pale grey #e8e5e0 plaster wall with subtle hand-
trowelled texture.

Mood: data fractured and reconciled, perspectives held in suspension.
Colour: warm grey base, subtle blue/red/green/amber tints on glass.
```

---

## 4 · The Long Read — `long-read.webp`

```
A thick leather-bound book, oxblood-coloured spine, lying open flat on
pale slate-blue linen. Both visible pages show tightly-spaced abstract
texture that reads as columns of text from a distance but contains no
actual letters. In the upper-left of the left page: an ornate gilded
illuminated initial — gold leaf and blue ink, decorative flourish.
Beside the book on the right: a vintage brass-and-glass typewriter
half in frame, deeply patinated keys, slight tilt. A black vintage
fountain pen rests across the book's gutter, ink slightly bleeding.
Background: pale slate blue #d6e2f0 paper with subtle watermark.

Mood: deep editorial reading, the physical weight of reported
journalism.
Colour: pale blue base, oxblood leather, gold-leaf accents, brass
typewriter, black ink.
```

---

## 5 · The Long View — `long-view.webp`

```
A geological strata cross-section like a museum diorama slice of earth.
Horizontal bands of layered earth tones — sand, ochre, terracotta,
deep umber, charcoal — running across the frame, each layer of slightly
different thickness following a Fibonacci-spaced rhythm. Embedded in
the strata: a tiny ammonite fossil, a fern leaf imprint, a flint
arrowhead, all carefully placed. The top stratum dusted with imperfect
flakes of gold leaf, edges torn and irregular. A subtle Fibonacci-
spiral curl of strata in the lower-right corner. Background: warm
amber #f4e2c0 paper with hand-deckled edge visible faintly.

Mood: deep time, accumulated truth, geological perspective on news.
Colour: amber base, layered earth tones, gold-leaf flecks, deep umber
shadow.
```

---

## 6 · The Queue — `queue.webp`

```
A slightly tilted stack of three vintage cassette tapes, viewed from a
3/4 elevated perspective. Each cassette has a hand-written paper label
(label texture visible but illegible — abstract pen marks only). Each
cassette in a different muted colour plastic: wine red, pale sage,
lavender grey. Visible wear: scratches on cassette shells, slight
yellowing on labels, one cassette has a thin strip of magnetic tape
pulled out and looping toward the viewer in a graceful curve. Beside
the stack: a single black plastic pencil cap, hinting at the cassette-
rewinding ritual. Background: pale lavender #e1d8f0 mottled paper with
a barely-visible printed-dot pattern beneath.

Mood: tactile personal media, an ambient archive that auto-plays.
Colour: lavender base, wine red / sage / lavender-grey plastics, beige
paper labels, black tape ribbon.
```

---

## Naming & placement

```
public/
└── cards/
    ├── minute.webp
    ├── digest.webp
    ├── all-sides.webp
    ├── long-read.webp
    ├── long-view.webp
    └── queue.webp
```

When all six are present, ping me — I'll swap the SVG illustrations in
`src/components/landing/value-props.tsx` for `next/image` plates with
text composited over them.

---

## Quality bar — reject and re-roll if

- Any letters, numbers, or words appear in frame
- Faces or people sneak in
- Modern UI / phone / laptop / screen visible
- Plastic-looking or AI-glossy surface treatment (you want film grain
  and material specificity)
- Colour drift far from the spec'd hex (`#fcded0` peach, etc.)
- Composition is decorative-floral kitsch (you want editorial / museum)
- Background is busy or fights the central object
