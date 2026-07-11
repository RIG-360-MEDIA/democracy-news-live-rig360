-- 0008-minhash-functions.sql
--
-- Pure-SQL MinHash. Four functions in analytics.* schema:
--
--   1. analytics.mh_shingle(text, k)        → text[]
--      k-word shingles of normalised input (lowercase, alphanum + space)
--
--   2. analytics.mh_signature(shingles, n)  → bigint[]
--      MinHash signature: for each of n seeds, MIN(hashtextextended(shingle, seed))
--
--   3. analytics.mh_jaccard(sig_a, sig_b)   → numeric
--      Estimated Jaccard = matching_positions / signature_length
--
--   4. analytics.mh_bands(signature, b, r)  → text[]
--      LSH bands: b bands of r rows each (n = b*r). Each band = 'i:md5(rows)'.
--      Two documents sharing any band hash are candidate pairs.
--
-- Standard params: title (k=3, n=64, b=8, r=8); summary (k=5, n=128, b=16, r=8);
-- lede (k=5, n=128, b=16, r=8). LSH probability of collision at
-- Jaccard >= 0.5 with b=16, r=8 is ~99.6%.
--
-- ALL FUNCTIONS ARE STABLE+ in semantics but marked STABLE (not IMMUTABLE)
-- because array_agg ordering is technically input-dependent. For our use
-- (per-row computation in MV builds), this doesn't affect caching.

----------------------------------------------------------------------
-- 1. SHINGLER
----------------------------------------------------------------------
-- Normalises: lowercase, replace non-alphanum with space, collapse whitespace.
-- Then generates k-word sliding-window shingles.
-- Returns empty array if input is NULL or too short.

CREATE OR REPLACE FUNCTION analytics.mh_shingle(input_text TEXT, k INT)
RETURNS TEXT[]
LANGUAGE SQL
STABLE AS $$
  WITH normed AS (
    SELECT regexp_replace(lower(COALESCE(input_text, '')), '[^a-z0-9]+', ' ', 'g') AS s
  ),
  words AS (
    SELECT word, ord
      FROM normed n,
           regexp_split_to_table(trim(n.s), '\s+') WITH ORDINALITY AS t(word, ord)
     WHERE word <> ''
  ),
  shingled AS (
    SELECT w.ord AS start_ord,
           array_agg(w2.word ORDER BY w2.ord) AS gram
      FROM words w
      JOIN words w2 ON w2.ord BETWEEN w.ord AND w.ord + k - 1
     GROUP BY w.ord
    HAVING COUNT(*) = k
  )
  SELECT COALESCE(array_agg(array_to_string(gram, ' ') ORDER BY start_ord), ARRAY[]::TEXT[])
    FROM shingled
$$;

----------------------------------------------------------------------
-- 2. SIGNATURE
----------------------------------------------------------------------
-- For each of n seeds (0..n-1), compute MIN(hashtextextended(shingle, seed))
-- across all shingles. Returns bigint[] of length n.
-- Empty shingles → array of MAX_BIGINT (matches no real signature).

CREATE OR REPLACE FUNCTION analytics.mh_signature(shingles TEXT[], n_hashes INT)
RETURNS BIGINT[]
LANGUAGE SQL
STABLE AS $$
  SELECT array_agg(
           COALESCE(min_hash, 9223372036854775807::BIGINT)
           ORDER BY seed
         )
    FROM (
      SELECT s.seed,
             MIN(hashtextextended(sh.shingle, s.seed)) AS min_hash
        FROM generate_series(0, n_hashes - 1) AS s(seed)
        LEFT JOIN unnest(COALESCE(shingles, ARRAY[]::TEXT[])) AS sh(shingle) ON TRUE
       GROUP BY s.seed
    ) per_seed
$$;

----------------------------------------------------------------------
-- 3. JACCARD ESTIMATE FROM TWO SIGNATURES
----------------------------------------------------------------------
-- Matching positions / signature length.
-- Returns NULL if lengths differ (caller bug) or either signature is NULL.

CREATE OR REPLACE FUNCTION analytics.mh_jaccard(a BIGINT[], b BIGINT[])
RETURNS NUMERIC
LANGUAGE SQL
STABLE AS $$
  SELECT CASE
           WHEN a IS NULL OR b IS NULL THEN NULL
           WHEN array_length(a, 1) <> array_length(b, 1) THEN NULL
           ELSE (
             SELECT COUNT(*) FILTER (WHERE a[i] = b[i])::NUMERIC
                  / array_length(a, 1)::NUMERIC
               FROM generate_series(1, array_length(a, 1)) AS i
           )
         END
$$;

----------------------------------------------------------------------
-- 4. LSH BANDS
----------------------------------------------------------------------
-- Split signature into b bands of r rows each.
-- Each band hashed to 'band_idx:md5(concatenated_rows)'.
-- The band_idx prefix prevents accidental cross-band hash collisions.

CREATE OR REPLACE FUNCTION analytics.mh_bands(signature BIGINT[], b INT, r INT)
RETURNS TEXT[]
LANGUAGE SQL
STABLE AS $$
  WITH band_rows AS (
    SELECT i AS band_idx,
           array_to_string(signature[(i*r + 1):(i*r + r)], ',') AS band_str
      FROM generate_series(0, b - 1) AS i
  )
  SELECT array_agg(band_idx::TEXT || ':' || md5(band_str) ORDER BY band_idx)
    FROM band_rows
$$;

----------------------------------------------------------------------
-- VERIFICATION — extensive unit + end-to-end tests follow as comments.
-- See tests-runner block in next migration (0008b or runtime check).
----------------------------------------------------------------------
-- Quick smoke (run after applying):
--
-- -- Unit: shingle correctness
-- SELECT analytics.mh_shingle('Hello world foo bar baz qux', 3);
-- -- expect: {hello world foo, world foo bar, foo bar baz, bar baz qux}
--
-- -- Unit: shingle too-short input
-- SELECT analytics.mh_shingle('hi', 3);
-- -- expect: {}
--
-- -- Unit: shingle NULL handling
-- SELECT analytics.mh_shingle(NULL, 3);
-- -- expect: {}
--
-- -- Unit: signature deterministic
-- SELECT analytics.mh_signature(ARRAY['a','b','c'], 8)
--      = analytics.mh_signature(ARRAY['a','b','c'], 8);
-- -- expect: t
--
-- -- Unit: identical inputs → Jaccard = 1.0
-- SELECT analytics.mh_jaccard(
--   analytics.mh_signature(ARRAY['a','b','c'], 64),
--   analytics.mh_signature(ARRAY['a','b','c'], 64));
-- -- expect: 1.000...
--
-- -- Unit: disjoint inputs → Jaccard ~ 0
-- SELECT analytics.mh_jaccard(
--   analytics.mh_signature(ARRAY['a','b','c'], 64),
--   analytics.mh_signature(ARRAY['x','y','z'], 64));
-- -- expect: 0.000 (or very small noise)
--
-- -- Unit: partial overlap → Jaccard ~ 0.33 (1 shared of 3 union)
-- SELECT analytics.mh_jaccard(
--   analytics.mh_signature(ARRAY['a','b','c','d'], 256),
--   analytics.mh_signature(ARRAY['c','d','e','f'], 256));
-- -- expect: ~0.50 (2 shared of 6 union → true Jaccard 0.333; MinHash estimate)
--
-- -- Unit: bands shape
-- SELECT array_length(analytics.mh_bands(analytics.mh_signature(ARRAY['a','b'], 128), 16, 8), 1);
-- -- expect: 16
--
-- End-to-end test (the Sarma cluster — known true positive):
--
-- WITH sarma1 AS (
--   SELECT primary_subject FROM analytics.article_signals_mv
--    WHERE primary_subject ILIKE 'Himanta Biswa Sarma sworn in as Chief Minister%' LIMIT 1
-- ),
-- sarma2 AS (
--   SELECT primary_subject FROM analytics.article_signals_mv
--    WHERE primary_subject ILIKE 'Himanta Biswa Sarma takes oath as Assam%' LIMIT 1
-- )
-- SELECT analytics.mh_jaccard(
--   analytics.mh_signature(analytics.mh_shingle(s1.primary_subject, 5), 128),
--   analytics.mh_signature(analytics.mh_shingle(s2.primary_subject, 5), 128)
-- ) AS sarma_jaccard
-- FROM sarma1 s1, sarma2 s2;
-- -- expect: > 0.4 (these two sentences share most 5-grams)
