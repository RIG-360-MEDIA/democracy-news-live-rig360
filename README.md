# RIG News

> News, your way. Six formats for every story.

A personalized news webapp where every story can be consumed in 6 distinct visual formats — each a faithful clone of a top-tier news/publishing site. Built as an investor-demo frontend with hardcoded backend.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Tech stack

- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS 3.4
- next-themes (dark mode)
- Framer Motion (animation)
- Recharts (charts)
- Zustand (state)
- Lucide React (icons)

## The 6 formats (tabs on every story)

| Tab | Inspired by | What it does |
|---|---|---|
| **Quick Read** | Inshorts | 60-word snapshot + big photo |
| **Full Story** | Medium | 1500-word essay, serif type, drop cap |
| **All Sides** | Ground News | Bias bar, how each side framed it, omitted points |
| **Timeline** | NYT "How It Happened" | Day-by-day scrollytell |
| **Quotes** | Bloomberg + FT | Quote cards grid, speaker faces |
| **By the Numbers** | The Pudding | Animated charts, stat provenance |

## Architecture

- **Brand chrome:** unified across non-story pages (Apple News × Flipboard × Linear)
- **Story pages:** 40px format-switcher strip on top + 100% clone interior below
- **Mock data:** 50+ stories in `src/data/stories/*.json` with all 6 format payloads pre-generated
- **Auth:** stubbed (localStorage user)

## Folder structure

See `../rig-surveillance/docs/content-platform/01-prd.md` for the full spec.
