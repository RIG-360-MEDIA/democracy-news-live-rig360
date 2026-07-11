# Rig Wire — Newsstand Illustration Brief

Six publication artefacts, one establishing composition. Each piece
rendered separately, then composited in code (compositing six distinct
items in one AI generation is unreliable). Final use: the post-onboarding
**Today** page, where each publication is hovered/clicked to enter its
mode's dedicated reader.

Plates carry **no legible text** — we composite today's actual headlines
in code over the imagery. Imagery should suggest "this is a magazine /
broadsheet / annual report" through format and texture, not through
readable headlines.

---

## Workflow

1. Paste each prompt into Midjourney v7 / DALL·E 3 / SDXL.
2. Roll several variations; pick the strongest per item.
3. Save to `/public/newsstand/` with the filenames listed.
4. Recommended format: **WebP**, 1500 × 2250 portrait (2:3) for the six
   publications; 2400 × 1200 landscape (2:1) for the establishing shot.
5. Tell me when all in place — I wire them into the Today page.

---

## Style preamble — paste in front of every prompt

```
Studio still-life product photography, single subject, isolated on
neutral cream-paper background (#fbf8f1). Large-format film aesthetic,
35mm Kodak Portra 400 grain, soft directional warm tungsten lighting
from upper-left, gentle drop-shadow beneath the subject. Three-quarter
front-elevated perspective so the publication appears to stand on a
flat surface. Hyper-tactile material specificity — viewer should feel
they could pick it up. References: Tom Sachs material studies, Wes
Anderson production stills, Aperture monographs, Bloomberg Businessweek
cover photography.

NEGATIVE: no readable text (abstract typographic shapes only, placeholder
lorem-ipsum is fine, no real legible English), no logos, no brands, no
faces, no people, no digital screens, no glossy plastic, no AI-floral
decoration, no neon, no glow.

Aspect ratio --ar 2:3, --q 2, --style raw
```

---

## 1 · The Minute — `minute.webp`

```
A single folded tabloid newspaper standing upright at a slight 3/4 angle,
peach-coloured newsprint (#fcded0). The visible front shows a bold red
ribbon banner across the top stamped with abstract numerals suggesting
"60 SEC" (treat as abstract letterforms, not legible), one massive serif
headline placeholder filling the centre (abstract type, not readable),
and a small high-contrast black-and-white documentary photograph
fragment in the lower third. Visible fold crease down the centre. Slight
ink-offset registration. Edges hand-cut deckled, freshly printed. Tiny
red wax-seal in a corner. Material: real newsprint, fibrous, faint grain.
```

---

## 2 · The Digest — `digest.webp`

```
A folded broadsheet morning newspaper, mint-green newsprint (#d6e8dc),
folded in half horizontally, lying flat at slight 3/4 angle on the
backdrop. The visible top half shows: a thin masthead rule at the top
(abstract letterforms suggesting a date, not legible), a five-row
table-of-contents arrangement with each row showing a small abstract
section-label tag in a different muted colour and an illegible headline
text. Newsprint texture, slight cream yellowing at the deckled edges, a
single coffee-ring stain in one corner, a fingerprint smudge on the
fold. Material: matte newsprint, real paper grain.
```

---

## 3 · All Sides — `all-sides.webp`

```
A wide-format broadsheet newspaper, warm grey newsprint (#e8e5e0),
opened to show a four-column front page at slight 3/4 angle. Each
vertical column has a different soft colour tint behind it: pale slate-
blue, pale coral, pale amber, pale neutral. A thin central rule divides
the columns. Each column has its own abstract headline at the top and
illegible body-text rules below. A thin red horizontal banner across
the top of the page. Material: real newsprint, slightly fibrous. Editorial
feel. The paper is flat but with one corner slightly curling up,
suggesting it has been read.
```

---

## 4 · The Long Read — `long-read.webp`

```
A thick perfect-bound magazine standing upright at slight 3/4 angle,
pale slate-blue cover (#d6e2f0). The cover features one large abstract
black-and-white documentary photograph filling the upper two thirds
(suggesting an empty newsroom, a closed building exterior, evocative
but unspecific — no people, no faces), and below it a single bold serif
headline placeholder (abstract typography, not readable) plus an italic
dek/subhead. A small drop-cap "T" visible at the bottom-left edge of the
cover. The spine is visible to one side showing real thickness (~120
pages suggested). Matte premium paper finish, very slight wear at the
corners. Subtle 35mm grain.
```

---

## 5 · The Long View — `long-view.webp`

```
A vintage hardback annual report bound in amber/warm-cream cloth (#f4e2c0),
lying face up at slight 3/4 angle. The cover shows: a deep-gold foil-
stamped numeric date "Q2 / 2026" (treat as abstract numerals not real
text), a small embossed seal or trademark suggesting a brand mark
(geometric, not readable), and a diagonal cream-paper ribbon stamped
with abstract "RETROSPECTIVE" letterforms. Pages slightly yellowed at the
edges. Cloth-bound spine visible. A dust jacket with slightly worn
corners. The whole object reads as a museum-quality limited-edition
periodical. Cream linen surface texture.
```

---

## 6 · The Queue — `queue.webp`

```
A vintage cassette tape laid flat next to its J-card insert which is
folded open beside it, lavender-grey colour scheme (#e1d8f0). The
cassette: amber-translucent plastic, faintly scratched, hand-written
paper label across the front (abstract pen marks, illegible writing).
The J-card insert: a multi-panel folded card showing abstract typewriter-
style track listings suggesting many entries (50ish lines visually). A
small circular "PLAY" sticker on the cassette. Beside them: a sharpened
pencil and a small black plastic pencil-cap (cassette-winding ritual).
A faint coffee-ring stain on the J-card. Tactile early-1990s mixtape
aesthetic. Pale lavender paper backdrop.
```

---

## 7 · The Newsstand — `newsstand-establishing.webp` (optional hero shot)

```
Wide-format editorial still-life: six different publications arranged
on a low wooden newsstand rack, viewed straight-on at slight elevation
angle. From left to right: a folded peach tabloid leaning forward, a
mint-green folded morning newspaper laid flat, a wide warm-grey
broadsheet half-opened to show four colour-tinted perspective columns,
a thick pale-blue magazine standing upright on its spine, an amber-cloth
hardback annual report lying with dust jacket showing, and a lavender
cassette tape with its J-card insert open beside it. Each publication
is distinct in format, size and colour, but the rack groups them as a
shared rhythm. The newsstand has a brass identifier rail at the top, a
soft cork-fabric covered shelf, and a small chalkboard date-tag with
abstract letterforms. Warm tungsten studio lighting from upper-left,
soft drop-shadow under each item. Cream-paper backdrop (#fbf8f1). Wes
Anderson / Tom Sachs production photography aesthetic. Tactile,
considered, hand-cut, no digital screens, no neon.

--ar 2:1 --q 2 --style raw
```

---

## Naming & placement

```
public/
└── newsstand/
    ├── minute.webp
    ├── digest.webp
    ├── all-sides.webp
    ├── long-read.webp
    ├── long-view.webp
    ├── queue.webp
    └── newsstand-establishing.webp   (optional — only if you want a hero shot)
```

When all six (or seven) are present, ping me — I will build the Today page
to composite today's actual headlines over each publication, with hover
states, click-to-enter routing, and a personalised order based on the
reader's onboarding answers.

---

## Quality bar — reject and re-roll if

- Any real readable English text appears (placeholder/abstract type is fine)
- Faces or people sneak in
- Modern UI / phone / laptop / screen visible
- Plastic-shine or AI-glossy surface treatment (you want film grain + paper)
- Colour drift far from spec'd hex (`#fcded0` peach, `#d6e8dc` mint, etc.)
- Composition floats with no surface or shadow grounding
- Background is busy or fights the central object
- Item looks digital-rendered rather than photographed (no CGI plastic look)
