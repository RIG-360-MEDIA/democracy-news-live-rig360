// src/lib/worldwide/ranking.ts
//
// The Worldwide front-page ranking — ports the validated scratch/worldwide/sections.sql
// (Stage-3, all edge-checks PASS) onto the live _v8 keeper. Read-only via sqlAnalytics.
//
// Importance = ln(independent sources) + capped facts + recency decay + tier-1 scoop bonus.
// Diversity: ≤2 per real topic in Top Stories; OTHER never capped.

import { sqlAnalytics } from '@/lib/db';

import { manualStoryCards } from '@/lib/studio/manual-feed';
import { getOverrides } from '@/lib/studio/overrides';
import { getWeights } from '@/lib/studio/weights';

import { groupIntoHubs } from './eventhub';

import type { EventHub, FrontPage, StoryCard, TopicSection } from './types';

// Topics that get their own front-page section (matches sections.sql EC8 set).
const SECTION_TOPICS = [
  'POLITICS', 'SPORTS', 'SECURITY', 'ENVIRONMENT', 'HEALTH',
  'BUSINESS', 'FINANCE', 'LEGAL', 'TECHNOLOGY', 'SOCIETY',
] as const;

// The generator emits ~16 topic labels; the page renders the sections above.
// Map every label onto a section so no story is orphaned. `null` = the label has
// no section of its own (it can still surface in Top Stories / Around the World).
const TOPIC_TO_SECTION: Record<string, (typeof SECTION_TOPICS)[number] | null> = {
  POLITICS: 'POLITICS', GOVERNANCE: 'POLITICS',
  SPORTS: 'SPORTS',
  SECURITY: 'SECURITY',
  ENVIRONMENT: 'ENVIRONMENT',
  HEALTH: 'HEALTH',
  BUSINESS: 'BUSINESS', INFRASTRUCTURE: 'BUSINESS',
  FINANCE: 'FINANCE',
  LEGAL: 'LEGAL',
  TECHNOLOGY: 'TECHNOLOGY', SCIENCE: 'TECHNOLOGY', TECH: 'TECHNOLOGY',
  AGRICULTURE: 'ENVIRONMENT',
  CULTURE: 'SOCIETY', SOCIETY: 'SOCIETY', SOCIAL: 'SOCIETY',
  INTERNATIONAL: null, OTHER: null,
};
const sectionOf = (topic: string): (typeof SECTION_TOPICS)[number] | null =>
  TOPIC_TO_SECTION[topic] ?? null;

const TITLE_FLAG =
  '(share price|top picks|result 20[0-9]{2}|gainers (and|&) losers|dream ?11|sensex|nifty|share market)';

const TOP_STORIES_MAX = 12;
// Candidate buffer sent per section. The front page claims stories into a GLOBAL de-dup set in this
// order: Top Stories → Around-the-World (one lead per country) → rails → Democracy → topic sections.
// Sections are LAST, so if we only send 6 the earlier claims (esp. Around-the-World's ~40 country
// leads) can strip a section down to 1 card even when the topic has dozens of stories. Send a generous
// buffer so post-dedup each section still fills; the page caps the RENDERED count separately.
const TOPIC_SECTION_MAX = 24;
const ATW_MIN_COUNTRY_STORIES = 1; // a country must have ≥this many surfaced stories to feature
const POOL_LIMIT = 600; // top-by-importance pool the front page is assembled from

interface ScoredRow {
  id: string;
  title: string;
  deck: string | null;
  image: string | null;
  generatedImageUrl: string | null; // sourced licensed hero URL when present (overrides the member thumbnail)
  hasArticle: boolean;
  dominantEntity: string | null;
  topic: string;
  country: string;
  importance: string; // numeric from pg
  independentSources: number;
  articleCount: number;
  facts: number;
  lastSeenAt: Date;
  runId: string | number | null; // generation run = unix epoch we published the story on our site
  repTier: number | null; // representative article's source_tier (1 best) — drives image upgrade
  repClean: boolean | null; // rep thumbnail's scan verdict (true=clean, false=flagged, null=unscanned)
}

/** Display-clean a headline: strip leading markdown junk ("** ", "# ", etc. from gen artifacts) and
 *  sentence-case an all-lowercase title (raw representative_title fallback). Returns '' if nothing
 *  usable remains — caller drops those rows so a titleless card never surfaces. (Root casing/extraction
 *  fix is DB-side; this is the front-end safety net the validation suite enforces.) */
// A CMS filename / URL slug that leaked in as a headline (e.g. "131703766.cms", "article-71109915.ece",
// or a bare numeric slug) — title extraction grabbed the URL, not the <h1>. Reject so it never surfaces.
function isJunkTitle(t: string): boolean {
  if (/\.(cms|html?|php|aspx?|jsp|ece|amp|stm)\b/i.test(t)) return true; // ends/contains a web file extension
  if (!/\s/.test(t) && /\d/.test(t) && !/\p{L}{4,}/u.test(t)) return true; // no spaces, digit-heavy, no real word
  return false;
}

// The Worldwide edition is English. Articled stories carry an English generated headline (passes);
// only non-articled fallbacks to a regional-language representative_title are non-English — drop those
// so the page never shows a Malayalam/Odia/Japanese headline in the English edition.
function isEnglishTitle(t: string): boolean {
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters === 0) return false;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  return latin / letters >= 0.5;
}

function cleanTitle(s: string | null): string {
  const t = (s ?? '').replace(/^[\s*>#_`\-]+/, '').trim();
  if (!t || isJunkTitle(t)) return '';
  // Sentence-case an all-lowercase title by capitalizing the first ALPHABETIC char (skip a leading
  // quote/number/₹ — e.g. ‘beautiful…' or ₹2,400 crore…), so no card shows an all-lowercase headline.
  return t === t.toLowerCase() ? t.replace(/\p{L}/u, (ch) => ch.toUpperCase()) : t;
}

function toCard(r: ScoredRow, now: number): StoryCard {
  const lastSeen = new Date(r.lastSeenAt).getTime();
  // "Published on our site" = the generation run timestamp (run_id is a unix epoch, seconds).
  // Guard a missing/garbage run_id by falling back to last-seen so the age is never nonsensical.
  const pub = Number(r.runId);
  const publishedMs = pub > 1_000_000_000 && pub < 20_000_000_000 ? pub * 1000 : lastSeen;
  return {
    id: r.id,
    title: cleanTitle(r.title),
    // strip leading gen markdown ("**", "#") from decks too, so no card renders raw markdown
    deck: r.deck ? r.deck.replace(/^[\s*>#_`-]+/, '').trim() || null : r.deck,
    image: r.generatedImageUrl ?? r.image,
    hasArticle: r.hasArticle,
    topic: r.topic,
    country: r.country,
    importance: Number(r.importance),
    independentSources: r.independentSources,
    articleCount: r.articleCount,
    facts: r.facts,
    lastSeenAt: new Date(r.lastSeenAt).toISOString(),
    freshnessSeconds: Math.max(0, Math.round((now - lastSeen) / 1000)),
    publishedSeconds: Math.max(0, Math.round((now - publishedMs) / 1000)),
    isScoop: r.articleCount === 1,
    dominantEntity: r.dominantEntity,
  };
}

/**
 * Build the Worldwide front page for a scope.
 * @param scope 'world' (no country filter) or an ISO2 country code.
 */
/** ORDERED clean thumbnails from the cluster's members (one batched query), best-first, up to 4 per
 *  story. The first is the primary image; the rest are backups the CLIENT walks when a photo fails to
 *  load in the browser (publisher hotlink-403 / dead URL) before falling to the branded image — a
 *  cluster usually has several usable photos, so a single bad pick must not force a fallback.
 *  Preference: confirmed-clean (scanned) first, then most-trusted domain, then best tier, then freshest.
 *  Never a flagged/denylisted one. */
async function clusterImageCandidates(storyIds: string[]): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  if (storyIds.length === 0) return m;
  const rows = (await sqlAnalytics`
    SELECT sid, url FROM (
      SELECT mem.story_id AS sid, a2.thumbnail_url AS url,
        row_number() OVER (PARTITION BY mem.story_id ORDER BY
          (ic2.clean IS TRUE) DESC,                      -- confirmed-clean photo first
          coalesce(dr.flag_rate, 0) ASC,                 -- then most-trusted source domain
          coalesce(a2.source_tier, 9) ASC,               -- then best source tier
          a2.published_at DESC NULLS LAST) AS rn         -- then freshest
      FROM analytics.story_cluster_members_v8 mem
      JOIN articles a2 ON a2.id = mem.article_id
      LEFT JOIN rigwire.image_checks ic2 ON ic2.thumbnail_url = a2.thumbnail_url
      LEFT JOIN rigwire.domain_reputation dr ON dr.domain = lower(split_part(split_part(a2.thumbnail_url, '://', 2), '/', 1))
      WHERE mem.story_id = ANY(${storyIds})
        AND a2.thumbnail_url IS NOT NULL AND a2.thumbnail_url <> ''
        -- never a hard-denylisted domain (>= 0.9) even if scanned clean; else scanned-clean, or
        -- unscanned from a source that isn't near-denylist (< 0.85) — same rule as the main image CASE.
        AND coalesce(dr.flag_rate, 0) < 0.9
        AND (ic2.clean = true OR (ic2.clean IS NULL AND coalesce(dr.flag_rate, 0) < 0.85))
    ) t
    WHERE t.rn <= 8
    ORDER BY sid, rn
  `) as unknown as { sid: string; url: string }[];
  for (const r of rows) {
    const list = m.get(r.sid) ?? [];
    if (!list.includes(r.url) && list.length < 4) list.push(r.url); // dedupe (dup members share a URL), cap 4
    m.set(r.sid, list);
  }
  return m;
}

/** Token signature of a headline — diacritics stripped, punctuation dropped, for near-dup detection. */
function dedupSig(title: string): Set<string> {
  const t = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');
  return new Set(t.split(/\s+/).filter((w) => w.length >= 3 || /^\d+$/.test(w)));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  const u = a.size + b.size - i;
  return u ? i / u : 0;
}
/**
 * Collapse near-identical stories — the SAME event that the clustering fragmented into several clusters
 * (e.g. seven "15 Indians / speedboat / Phú Quốc" retellings). Keeps the strongest (highest importance)
 * and drops the rest. Deliberately CONSERVATIVE (same dominant entity + >=0.5 headline-token overlap) so
 * it never merges genuinely distinct stories. NOTE: this is a display-layer patch — the real fix is the
 * upstream cluster-merge (these clusters share zero articles yet cover one event), which needs the box's
 * LaBSE embeddings that aren't replicated to the reader DB.
 */
function collapseNearDuplicates(cards: StoryCard[]): StoryCard[] {
  const kept: { c: StoryCard; s: Set<string> }[] = [];
  for (const c of [...cards].sort((a, b) => b.importance - a.importance)) {
    const s = dedupSig(c.title);
    const dup = kept.some((k) => !!k.c.dominantEntity && k.c.dominantEntity === c.dominantEntity && jaccard(k.s, s) >= 0.5);
    if (!dup) kept.push({ c, s });
  }
  const keep = new Set(kept.map((k) => k.c.id));
  return cards.filter((c) => keep.has(c.id));
}

export async function getFrontPage(scope: string): Promise<FrontPage> {
  const isWorld = scope === 'world';
  const scopeFilter = isWorld
    ? sqlAnalytics``
    : sqlAnalytics`AND sc.subject_country = ${scope}`;

  // Editorial overrides win on read (epic 002). Fetch them BEFORE the pool query so an editor who
  // Published or Pinned a machine-HELD story can force it into the pool — the base SQL only keeps
  // PUBLISHABLE rows, so without this the override would have nothing to attach to (silent no-op).
  const overrides = await getOverrides();
  const forcedIds = [...overrides.values()]
    .filter((o) => o.action === 'live' || o.action === 'pinned')
    .map((o) => o.storyId);
  const forcedClause = forcedIds.length
    ? sqlAnalytics`OR (sc.story_id = ANY(${forcedIds}) AND length(g.body) >= 400 AND g.body NOT ILIKE '%no facts available%')`
    : sqlAnalytics``;

  const rows = (await sqlAnalytics`
    WITH facts AS (
      SELECT story_id, count(*)::int AS fc FROM analytics.story_facts_v8 GROUP BY 1
    ),
    gen AS (
      SELECT DISTINCT ON (story_id) story_id, headline, deck, body, status, strategy, topic, run_id, generated_image
      FROM analytics.story_generated_v8 ORDER BY story_id, updated_at DESC
    )
    SELECT sc.story_id                                   AS id,
           -- Every row here is an articled, substantive story (see the WHERE clause), so use the
           -- generated headline/deck directly, falling back to the source title/summary only if the
           -- generator left one blank. topic prefers the article's own classify_topic label (g.topic)
           -- over the cluster label (sc.topic is 'OTHER' for most clusters) so sections fill correctly.
           coalesce(nullif(g.headline, ''), sc.representative_title) AS title,
           coalesce(nullif(g.deck, ''), nullif(a.summary_preview, '')) AS deck,
           -- flag_rate >= 0.9 is the HARD denylist (state-media / heavy-brand outlets the classifier
           -- passes as clean via false-negatives) — null it even when scanned "clean". Below that, the
           -- normal rule: null if scanned-flagged (ic.clean IS FALSE). An UNSCANNED image was never
           -- actually inspected, so it is nulled only when its domain is already near-denylist (>= 0.85);
           -- below that we SHOW the real thumbnail rather than send an inspected-innocent story to the
           -- branded fallback. (Was 0.5 — with sparse image_checks coverage that nulled the majority of
           -- real photos purely for lack of a scan record, which is why so many cards used fallbacks.)
           CASE WHEN coalesce(dr.flag_rate, 0) >= 0.9
                     OR ic.clean IS FALSE
                     OR (ic.clean IS NULL AND coalesce(dr.flag_rate, 0) >= 0.85)
                THEN NULL ELSE a.thumbnail_url END        AS image,
           g.generated_image->>'url'                     AS "generatedImageUrl",
           a.source_tier                                 AS "repTier",
           ic.clean                                      AS "repClean",
           true                                          AS "hasArticle",
           g.run_id                                      AS "runId",
           coalesce(nullif(g.topic, ''), nullif(sc.topic, ''), 'OTHER') AS topic,
           coalesce(nullif(sc.subject_country, ''), 'XX') AS country,
           (SELECT e.key FROM jsonb_each_text(sc.primary_entities) e
             ORDER BY (e.value)::int DESC LIMIT 1)        AS "dominantEntity",
           sc.independent_source_count                  AS "independentSources",
           sc.article_count                             AS "articleCount",
           coalesce(f.fc, 0)                            AS facts,
           sc.last_seen_at                              AS "lastSeenAt",
           round((
                -- base = breadth + substance + scoop
                (1.0 * ln(1 + sc.independent_source_count)
                 + 0.5 * ln(1 + least(coalesce(f.fc, 0), 15))
                 + (CASE coalesce(a.source_tier, 2) WHEN 1 THEN 1.0 WHEN 2 THEN 0.3 ELSE 0.0 END))
                -- RECENCY GATE: multiply (not add) so a huge-but-old story cannot lead. Anchored to
                -- real now() (NOT max(last_seen_at) — future-dated source rows threw that ~76h ahead
                -- and flattened the curve so stale mega-stories froze the feed). Age clamped ≥ 0 so a
                -- future-dated row can't game it. floor 0.03 + decay (halflife 1.0d): a 3-day-old story
                -- keeps ~7% of its base, so fresh stories reliably rotate to the top.
                * (0.03 + 0.97 * exp(-greatest(0, extract(epoch FROM (now() - sc.last_seen_at))) / 86400.0 / 1.0))
                -- PILE DEMOTION: a confirmed multi-event pile (Guard-C SEVERAL -> HELD stub) is not a
                -- single readable story -> keep it out of the lead (it belongs in an event-hub, B+).
                * (CASE WHEN g.strategy = 'stub' AND g.status ILIKE '%HELD%' THEN 0.25 ELSE 1.0 END)
                -- TOPIC WEIGHT: sport is heavily covered (high breadth) but rarely the most important
                -- world story -> hard-demote so it never leads. 0.4 means a cricket match needs 2.5×
                -- more sources than a political story to outscore it.
                * (CASE WHEN coalesce(nullif(g.topic, ''), sc.topic) ILIKE 'sports' THEN 0.4 ELSE 1.0 END)
                )::numeric, 2)                          AS importance
    FROM analytics.story_clusters_v8 sc
    LEFT JOIN facts f USING (story_id)
    LEFT JOIN gen g USING (story_id)
    LEFT JOIN articles a ON a.id = sc.representative_article_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    LEFT JOIN rigwire.domain_reputation dr ON dr.domain = lower(split_part(split_part(a.thumbnail_url, '://', 2), '/', 1))
    WHERE sc.suppression_reason IS NULL
      -- DEDUP GUARD: a cluster merged into another by the cross-window re-join sets redirected_to;
      -- never surface the stale duplicate pile (DB chat contract, 2026-06-21).
      AND sc.redirected_to IS NULL
      -- Phase-0 same-event merge: hide clusters folded into a canonical story (only the canonical surfaces).
      AND NOT EXISTS (SELECT 1 FROM analytics.story_dedup dd WHERE dd.story_id = sc.story_id)
      AND sc.independent_source_count IS NOT NULL
      AND sc.representative_title !~* ${TITLE_FLAG}
      -- FRESHNESS CAP: a "Worldwide today" page never surfaces stories dormant >7 days (no new
      -- coverage in a week). 68% of articled-surfaceable stories are >7d — drop them everywhere.
      AND sc.last_seen_at >= now() - interval '7 days'
      -- POOL = ARTICLED stories only. Without this, LIMIT is spent on high-source article-less
      -- clusters (importance rewards breadth/recency, not articledness), so the handful of readable
      -- stories rank below the cut and the page starves. Substance = a fact-ledger OR a real body:
      -- v2 writes verified prose but no legacy story_facts_v8 row, so facts>0 alone hid all of it.
      AND g.body IS NOT NULL
      -- GARBAGE GUARD: a parse-fail generation row (model returned an unparsed JSON blob) has
      -- headline '(parse-fail)' and a body that starts with '{'. Never surface it — real prose
      -- never begins with a brace. The generator should mark these HELD; this is defence-in-depth.
      AND g.headline NOT ILIKE '%(parse-fail)%'
      AND left(btrim(g.body), 1) <> '{'
      AND (
        -- machine-publishable: verified prose with substance (fact-ledger OR a real body).
        (g.status LIKE 'PUBLISHABLE%' AND g.strategy <> 'stub'
         AND (coalesce(f.fc, 0) > 0 OR (length(g.body) >= 800 AND g.body NOT ILIKE '%no facts available%')))
        -- OR editor force-surfaced (Published/Pinned a held story) — the editor overrides the hold.
        ${forcedClause}
      )
      ${scopeFilter}
    ORDER BY importance DESC
    LIMIT ${POOL_LIMIT}
  `) as unknown as ScoredRow[];

  const now = Date.now();
  // Drop rows with no usable title (titleless "**"/empty gen) so a broken card never surfaces.
  // Surface ONLY clickable stories — a card with no generated article (hasArticle=false) can't open,
  // so it never appears anywhere (top stories, sections, hubs, around-the-world). Everything you see opens.
  // Editor-authored manual stories join the automated pool (epic 002) and flow through the same
  // override/weight/sort/section logic below.
  const manual = await manualStoryCards();
  // Image resolution: build an ordered list of clean cluster photos per story (best-first). The first
  // is the primary; the rest ride along as backups the client walks when a photo fails to load in the
  // browser (publisher hotlink-403 / dead URL). Computed for EVERY row — even a story whose own rep
  // looks clean needs backups, since its single chosen URL may still 403 in the browser. Falls back to
  // the rep image only if the cluster yielded no clean candidate (then the view layer shows the brand).
  const candMap = await clusterImageCandidates(rows.map((r) => r.id));
  const basePool = [
    ...rows.map((r) => {
      const cands = candMap.get(r.id) ?? [];
      // Sourced licensed hero (Commons/Pexels) wins as the primary; the cluster's member
      // photos ride along as browser fallbacks if the sourced image ever fails to load.
      const primary = r.generatedImageUrl ?? cands[0] ?? r.image ?? null;
      const alts = cands.filter((u) => u !== primary).slice(0, 3);
      return { ...toCard(r, now), image: primary, imageAlts: alts };
    }),
    ...manual,
  ].filter((c) => c.title.length > 0 && isEnglishTitle(c.title) && c.hasArticle);

  // ── Editorial overrides win on read (epic 002) — empty table => reader feed is pure automation. ──
  //   killed → hide everywhere · edited_* → replace headline/deck · importance_delta → re-rank ·
  //   pinned → large boost (top of Top Stories) · live → force-surface a held story (fetched above).
  const weights = await getWeights();
  const tw = weights.topicWeights;
  const cw = weights.countryWeights;
  let pool = basePool
    .filter((c) => overrides.get(c.id)?.action !== 'killed')
    .map((c) => {
      const o = overrides.get(c.id);
      // editor ranking knobs: per-section topic weight × per-country weight (default 1 → no change)
      const section = sectionOf(c.topic);
      const wMul = (section ? tw[section] ?? 1 : 1) * (cw[c.country] ?? 1);
      const pinBoost = o?.action === 'pinned' ? 10000 - (o.pinnedRank ?? 1) : 0;
      const importance = c.importance * wMul + (o?.importanceDelta ?? 0) + pinBoost;
      if (importance === c.importance && !o?.editedHeadline && !o?.editedDek && !o?.editedImage) return c;
      return {
        ...c,
        image: o?.editedImage ?? c.image,
        title: o?.editedHeadline ?? c.title,
        deck: o?.editedDek ?? c.deck,
        importance,
        pinned: o?.action === 'pinned',
      };
    })
    .sort((a, b) => b.importance - a.importance);

  // Collapse re-clustered duplicates of one event (same entity, near-identical headline) so a story never
  // appears many times across the page as if it were separate coverage. Applied to the whole pool.
  pool = collapseNearDuplicates(pool);

  // Top Stories — group angle-stories into B+ hubs, then diversity-cap (≤2 per real topic; OTHER uncapped).
  // Editor pins stay STANDALONE: never absorbed into a hub (where a fresher hub-mate would replace the
  // pinned story as the displayed card) and exempt from the diversity cap. They lead via +pinBoost.
  const pinnedUnits = pool.filter((c) => c.pinned);
  const rest = pinnedUnits.length ? pool.filter((c) => !c.pinned) : pool;
  const units = [...pinnedUnits, ...groupIntoHubs(rest)].sort((a, b) => b.importance - a.importance);
  const perTopic = new Map<string, number>();
  const topStories: Array<StoryCard | EventHub> = [];
  for (const u of units) {
    const isPinned = !('kind' in u) && u.pinned === true;
    if (!isPinned && u.topic !== 'OTHER') {
      const n = perTopic.get(u.topic) ?? 0;
      if (n >= 2) continue;
      perTopic.set(u.topic, n + 1);
    }
    topStories.push(u);
    if (topStories.length >= TOP_STORIES_MAX) break;
  }

  // Ids already surfaced in Top Stories (incl. hub members) — dedupe BOTH the topic sections and
  // Around the World against these, so no story ever appears twice on one screen.
  const shownInTop = new Set<string>();
  for (const u of topStories) {
    if ('kind' in u) u.members.forEach((m) => shownInTop.add(m.id));
    else shownInTop.add(u.id);
  }

  // Freshness cap for sections and ATW. Thin topics (Finance/Business/Tech get only ~10 stories a WEEK,
  // vs Security's ~90) have too few <48h stories to fill a band, so those sections were rendering empty.
  // A 4-day window keeps sections "recent" while giving low-volume topics enough to show.
  const SECTION_MAX_AGE_S = 96 * 3600;
  const freshPool = pool.filter((c) => c.freshnessSeconds <= SECTION_MAX_AGE_S);

  // Topic sections — top N per topic, excluding anything already in Top Stories, non-empty only.
  const sections: TopicSection[] = SECTION_TOPICS.map((section) => ({
    topic: section,
    stories: freshPool.filter((c) => sectionOf(c.topic) === section && !shownInTop.has(c.id)).slice(0, TOPIC_SECTION_MAX),
  })).filter((s) => s.stories.length > 0);

  // Around the World — one (not-already-shown) story per country, eligible countries only.
  const countryCounts = new Map<string, number>();
  for (const c of freshPool) {
    if (c.country !== 'XX') countryCounts.set(c.country, (countryCounts.get(c.country) ?? 0) + 1);
  }
  const seenCountry = new Set<string>();
  const aroundTheWorld: StoryCard[] = [];
  for (const c of freshPool) {
    if (c.country === 'XX' || seenCountry.has(c.country) || shownInTop.has(c.id)) continue;
    if ((countryCounts.get(c.country) ?? 0) < ATW_MIN_COUNTRY_STORIES) continue;
    seenCountry.add(c.country);
    aroundTheWorld.push(c);
  }

  // Democracy — a cross-cutting theme (not a machine topic): stories about elections, protest,
  // press freedom, authoritarianism, rights and rule-of-law. Keyword/entity match over the pool.
  const democracy = pool
    .filter((c) => DEMOCRACY_RE.test(`${c.title} ${c.deck ?? ''}`))
    .slice(0, DEMOCRACY_MAX);

  return { scope, topStories, aroundTheWorld, sections, democracy };
}

// Democracy-theme signals — deliberately broad; refine later with an LLM tag at generation time.
const DEMOCRACY_RE =
  /\b(democra\w*|electio\w*|\bvote\b|voting|ballot|referendum|parliament\w*|opposition|dissident|protest\w*|censor\w*|press freedom|journalist\w*|free speech|freedom of speech|authoritari\w*|autocra\w*|dictator\w*|regime|junta|coup|crackdown|repress\w*|suppress\w*|human rights|civil rights|rule of law|martial law|impeach\w*|sanction\w*|corruption|whistleblow\w*|activist\w*|exile|detain\w*|jailed)\b/i;
const DEMOCRACY_MAX = 8;
