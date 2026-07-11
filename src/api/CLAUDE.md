# src/api/ — NOT IN USE YET

This folder exists as a reservation. The Rig Wire prototype is statically
rendered from `<feature>-data.ts` files; there is no live API today.

When the first API route lands here, it must follow
`.claude/rules/api-conventions.md`. Summary of what that means:

- **REST + JSON.** Response envelope `{ ok, data, error, meta }`.
- **SSE** for live streams (Worldwide breaking, Flash refresh). Not WebSockets.
- **Routes:** `/api/<resource>` and `/api/<resource>/[id]`. No verbs in names.
- **Validation:** every input goes through Zod, server-side. No exceptions.
- **Observability:** every request emits `traceId`, `userId | null`, `route`,
  `status`, `duration_ms`. For breaking-news endpoints: `freshness_seconds`.
- **Auth:** `httpOnly` `SameSite=Lax` `Secure` cookies. No long-lived JWTs
  in the browser.

Until then: **do not put anything in this folder.** Static content goes in
`src/components/<mode>/<mode>-data.ts`. Shared helpers go in `src/lib/`.

If you find yourself reaching for `src/api/` to solve a layout or styling
problem, you have the wrong tool. Read `STRUCTURE.md` first.
