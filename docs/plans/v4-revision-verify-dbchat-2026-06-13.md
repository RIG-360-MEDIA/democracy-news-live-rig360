# DB-chat kickoff — verify V4 embedding revision is ONE recipe (pre-_v8 gate)

**From:** analytics. **Why:** `articles.labse_embedding_v4` carries TWO `embedding_revision`
labels. Clustering must not blend two different vector spaces. Confirm they're the same
recipe (or fix) BEFORE the `_v8` rerun. Read-only except the optional re-stamp. Report raw.

## What analytics observed (2026-06-13, verify on your side)
- `v4-tr-title-1024` (model sentence-transformers/LaBSE) — ~142K rows
- `836121a0533e5664b21c7aacc5d22951f2b8b25b` (LaBSE) — ~131K rows
- `?`/null — ~572 rows
- V4 coverage ~94.7% corpus-wide; frontier lag ~40 min (healthy).
Hypothesis: both labels = the SAME V4 recipe (translated·title·1024·max_seq512), just
two stamping conventions (human name vs git SHA). Confirm or refute.

## Checks to run
1. **Recipe identity:** does `embedding_recipe.py` at SHA `836121a` produce the
   `v4-tr-title-1024` config (same model, translated-title input, 1024 dim, max_seq 512,
   same normalization/pooling)? Confirm from the SSOT, not memory.
2. **Dim/space sanity:** for a sample from EACH label, confirm `vector_dims(labse_embedding_v4)`
   is identical (1024) and the vectors are L2-normalized the same way.
3. **Cross-label cosine sanity (the real test):** pick ~10 article PAIRS that are
   near-duplicates / same-event but where one row is labeled `v4-tr-title-1024` and the
   other `836121a`. Compute cosine similarity across the label boundary. If same recipe,
   same-event cross-label pairs should score as high as within-label pairs. If cross-label
   sims are systematically lower (a "seam"), the spaces differ → NOT the same recipe.
4. **Timeline:** when did the label switch (min/max `collected_at` or `embedded_at` per
   label)? Confirms it's a stamping change at a date, not two parallel pipelines.

## Report (raw)
- recipe-identity verdict (SSOT diff)
- dims per label · normalization check
- the ~10 cross-label cosine sims vs a within-label baseline
- the switch date

## Decision (analytics, on your numbers)
- **Same recipe** (cross-label sims ≈ within-label) → re-stamp the minority label to one
  canonical string (cosmetic) and proceed with the `_v8` rerun over all ~273K V4 rows.
- **Different spaces** (cross-label seam) → re-embed the minority under the canonical V4
  recipe before clustering; do NOT cluster across the seam.
- Either way: the ~15K unembedded (mostly junk/fetch_failed) and 572 null-rev rows are
  excluded from clustering or embedded first — your call on count.
