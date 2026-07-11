# Phase 5 — Worldwide go-live: deploy handoff (2026-06-17)

The Worldwide page is built + verified (Phases 1–4). To go public it must be **deployed on the box**
(so SSR reaches the DB over the docker network — the dev tunnel is not a production path) and the
**keys rotated**. This is the infra/DB lane + one user action.

## 1. Deploy the Next app on the box (DB/infra lane)
- **Build + serve:** `npm run build` → `npm start` (Next standalone) in a container, same pattern as
  `osint-backend` (Dockerfile + compose service), behind `rig-caddy` for the public domain.
- **DB connectivity (the key change vs dev):** the Worldwide routes are `force-dynamic` SSR, so they
  query Postgres at request time. In the container, point at the **docker-network hostname**, NOT the
  dev tunnel:
  - `ANALYTICS_DB_URL=postgresql://analytics_user:<pass>@rig-postgres:5432/rig`  (internal host `rig-postgres`, port **5432** — not `localhost:5433`)
  - `RIGWIRE_DB_URL=postgresql://rigwire_app:<pass>@rig-postgres:5432/rig`
  - plus the Auth.js env (`AUTH_SECRET`, etc.).
- **Public routes already set:** `/long-read` + `/long-read/[slug]` are in `isPublicPath` (config.edge) — no login wall.
- **Caching/observability/rate-limiting** per `api-conventions.md`: reads carry `s-maxage=60` already;
  add per-route p99 + the `freshnessSeconds` it returns; anon rate-limit.

## 2. Wire the cron to the shown-set endpoint (replaces the SQL replication)
Once deployed, the gen-cron should call **`GET /api/worldwide/shown?scope=world`** (and per country
scope) → read `data.ids` → generate for that exact set. This is the single source of truth — retire
the replicated `A∪B` SQL from `dbchat-gen-alignment-2026-06-16.md`.

## 3. 🔑 Key rotation (USER — blocks public exposure)
Generate new **Groq + Cerebras** keys at the provider consoles (assistant/DB-chat cannot create
credentials) → DB does the ~2-min `.env` swap. Must happen before the site is public.

## 4. Soak + launch
Flip user-visible behind the kill-switch + parachute; **watch the first breaking-news burst** (the
one motion never tested live). Rollback = kill-switch.

## Acceptance test (the one that was deploy-gated)
After deploy, from the public URL: `GET /api/worldwide?scope=world` returns **real JSON** (not the SPA
shell), and the `hasArticle=true` count across `topStories`+`sections` matches the current DB-equivalent
(~88% of the shown set). Then the literal acceptance curl passes and Worldwide is fully live.

## Known caveats carried in
- Edgeless 14.9k Iran mega: contained (SIZE_NET auto-flag) but not split — needs a re-cluster (the
  forward loop should compute edges for accreted members; unbuilt). Optional.
- 15 GB box is tight: heavy janitor/forward passes one-pile-at-a-time or mem-capped sidecar.
- Don't run a big gen-fill during a big NLP drain (shared daily cloud quota) — stagger.
