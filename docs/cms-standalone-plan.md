# Rig Wire CMS — standalone editorial control plane

**What it is:** one **control room** where editors supervise AI-generated content (keep / kill / pin /
fix / merge) across **every** Rig Wire product — DNL, OSINT desk, Windlass, Ask-RIG — not a separate
CMS per product. It is a *control plane over a generation pipeline*, not a from-scratch authoring tool.

**The load-bearing idea:** the control room writes to **one canonical, product-namespaced table**
(`editorial.decisions`); every product *reads* its own slice. A new product = add its name + a thin
reader. No per-product logic inside the CMS.

```
   Control room (one app, one login, one audit log)
        │ writes decisions (kill/pin/edit/merge…)
   editorial.decisions  (product, content_id, …)      ← canonical, on the BOX
        │ read by
   DNL   OSINT desk   Windlass   Ask-RIG   …
```

---

## Step 1 — canonical decisions table  ✅ SHIPPED (migration 005)

- `editorial.decisions(product, content_id, action, pinned_rank, importance_delta, section_override,
  human_locked, edited_*, payload jsonb, editor_id, reason, …)` — UNIQUE(product, content_id).
- `editorial.audit` — append-only before/after snapshot on **every** write (trigger `trg_audit_decision`)
  → any state is reversible; also the ranker-quality signal.
- **Zero-risk + additive:** DNL still writes `rigwire.editorial_overrides`; trigger
  `trg_mirror_override` mirrors each change into `editorial.decisions(product='dnl')`. Nothing in the
  live app changed. Backfilled 4 DNL rows; mirror + audit verified live on the box.
- Shared accessor `src/lib/editorial/decisions.ts` — `getDecisions / applyDecision / decisionHistory`
  + named actions (publish/kill/revive/pin/lock). **This is the multi-product read/write contract.**

## Step 2 — standalone + multi-product  (contract done; app extraction next)

**Done:** the shared accessor above; confirmed editorial state lives on the box (role `rigwire_app`),
Neon copy empty, so the CMS reads/writes the box directly.

**Remaining — extract `/studio` into its own app:**
1. New Next.js app `rig-cms` (own deploy, own domain e.g. `cms.rig360media.com`). Reuse the existing
   Auth.js config + `auth.users`/roles on the box (one identity system — do NOT fork it).
2. Move `src/app/studio/**` + `src/lib/studio/**` in; swap DNL-specific writes to the product-agnostic
   `editorial/decisions.ts` accessor with `product` selected in the UI (default `dnl`).
3. Wire each product as a read adapter: `getDecisions('<product>', ids)` merged into that product's
   ranking (DNL already does the equivalent via `getOverrides`; generalise it).
4. Fix the Auth.js sign-in redirect leaking `*.vercel.app` (set `AUTH_URL` to the real host).

## Step 3 — the powerful views  (data layer done; UI next)

**Done — `src/lib/editorial/story-lens.ts`**, proven on real merged events (e.g. Trump–Iran event =
16 fragments / 95 articles):
- `timeline(canonicalId)` — every article across the event's PRESERVED fragments, in publish order.
- `bias(canonicalId)` — coverage split by source `political_lean` (left/center/right/state/unknown),
  Ground-News style. *Limitation:* ~1,500 sources lack a lean tag → large UNKNOWN bucket; sharpen by
  enriching `public.sources.political_lean`.
- `perspectives(canonicalId)` — distinct outlets covering the event, each with lean + a sample article.
- `storyLens(canonicalId)` — all three in one call for the CMS story-detail page.

Fragments come from the event-merge system (`analytics.story_dedup`), which was built non-destructively
**for exactly these uses**. Run the lens against the BOX (full fidelity); Neon carries only a window.

**Remaining:** the CMS UI for these three lenses + a merge-review screen (confirm/reject the LLM's
`analytics.merge_verdicts`) + source management (edit `political_lean`, add/deactivate feeds).

---

## Order of remaining work
1. `rig-cms` app scaffold + auth reuse + move studio. 2. Point its analytics client at the box.
3. Story-detail page rendering `storyLens`. 4. Merge-review + source-management screens.
5. Onboard product #2 (OSINT desk) as the first non-DNL reader — proves the namespace model.
