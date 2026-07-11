-- 0013-onboarding-shape.sql
--
-- Rebuilds rigwire.user_preferences for the locked onboarding shape
-- (Q1–Q8 + silents), and adds rigwire.onboarding_seed_articles —
-- the JOIN target the ranker uses to decode each user's seed picks
-- into a 5-dimensional cold-start vector (topic / length / region /
-- tone / time-horizon).
--
-- Why drop-and-recreate user_preferences:
--   0012 created a speculative column set (preferred_modes,
--   preferred_langs, region) that doesn't match the locked onboarding
--   questions. Only test rows exist (we're pre-launch); a clean
--   recreate is honest, fast, and keeps the migration history
--   readable. Once we ship, additive ALTER TABLE for future changes.
--
-- Integrity:
--   - RLS + FORCE on user_preferences (owner role doesn't bypass).
--   - CHECK constraint: onboarded_at non-NULL implies all required
--     columns are populated. "Onboarded" in the DB means actually
--     answered everything — analytics and middleware can trust it.

BEGIN;

----------------------------------------------------------------------
-- 1. Drop the 0012 user_preferences (only test rows exist).
----------------------------------------------------------------------
DROP TABLE IF EXISTS rigwire.user_preferences CASCADE;

----------------------------------------------------------------------
-- 2. rigwire.user_preferences — locked shape (8 questions + 3 silent).
----------------------------------------------------------------------
CREATE TABLE rigwire.user_preferences (
  user_id              UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Q1: topics (3–8 keys from the ~28-key chip taxonomy in onboarding-flow.tsx).
  -- Taxonomy intentionally NOT enforced at DB level so it can evolve in app code.
  topics               TEXT[]       NOT NULL DEFAULT '{}',

  -- Q2: reader intents (multi). Maps directly to product modes.
  reader_intents       TEXT[]       NOT NULL DEFAULT '{}'
                                    CHECK (reader_intents <@ ARRAY[
                                      'quick_morning',
                                      'deep_read',
                                      'breaking_only',
                                      'across_sides',
                                      'weekend_reader'
                                    ]::TEXT[]),

  -- Q3: anchor delivery slot (single).
  delivery_window      TEXT         CHECK (delivery_window IN
                                      ('morning','lunch','evening','bedtime')),

  -- Q4: outbound cadence (single). Channels derived from this + later opt-ins.
  delivery_frequency   TEXT         CHECK (delivery_frequency IN
                                      ('daily_only','daily_plus_breaking',
                                       'breaking_only','web_only')),

  -- Q5: cold-start picks from the 12-article preset.
  --   seed_picks  = 5 article ids the user chose
  --   seed_skipped = the 7 ids they were shown but didn't pick (free negative signal)
  seed_picks           TEXT[]       NOT NULL DEFAULT '{}',
  seed_skipped         TEXT[]       NOT NULL DEFAULT '{}',

  -- Q6: tiered region. No cap on secondary (per product decision).
  primary_region       TEXT,                                  -- ISO 3166-1 alpha-2
  secondary_regions    TEXT[]       NOT NULL DEFAULT '{}',

  -- Q7: voice preference (single). Drives summary-generation templates.
  voice_preference     TEXT         CHECK (voice_preference IN
                                      ('wire','newsroom','magazine','briefing','voice')),

  -- Q8: signup intent (single). Drives week-1 retention messaging cohort.
  signup_intent        TEXT         CHECK (signup_intent IN
                                      ('better_habit','less_doomscroll','follow_stories',
                                       'no_slant','curious')),

  -- Silent (auto-captured client-side).
  locale               TEXT         NOT NULL DEFAULT 'en',    -- BCP-47, navigator.language
  timezone             TEXT         NOT NULL DEFAULT 'UTC',   -- IANA, Intl.DateTimeFormat
  onboarded_at         TIMESTAMPTZ,                           -- gate marker (NULL = incomplete)

  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Integrity: "onboarded" requires the complete answer set.
  CONSTRAINT user_preferences_complete_when_onboarded CHECK (
    onboarded_at IS NULL OR (
      primary_region          IS NOT NULL
      AND delivery_window     IS NOT NULL
      AND delivery_frequency  IS NOT NULL
      AND voice_preference    IS NOT NULL
      AND signup_intent       IS NOT NULL
      AND array_length(topics, 1)     >= 3
      AND array_length(seed_picks, 1) =  5
    )
  )
);

ALTER TABLE rigwire.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rigwire.user_preferences FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_prefs ON rigwire.user_preferences;
CREATE POLICY users_own_prefs ON rigwire.user_preferences
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

----------------------------------------------------------------------
-- 3. rigwire.onboarding_seed_articles — Q5 picker source + ranker JOIN.
----------------------------------------------------------------------
-- Public reference data. No RLS — every user sees the same 12 rows.
-- The 6 topics × 2 lengths grid is varied along 3 orthogonal axes
-- (geography, tone, time-horizon) so each pick reveals 5 signals.

DROP TABLE IF EXISTS rigwire.onboarding_seed_articles CASCADE;

CREATE TABLE rigwire.onboarding_seed_articles (
  id              TEXT         PRIMARY KEY,
  headline        TEXT         NOT NULL,
  dek             TEXT         NOT NULL,                     -- one-line subtitle
  source_label    TEXT         NOT NULL,                     -- e.g. 'Reuters', 'The Atlantic'

  -- Decoding dimensions (the analysis grid).
  topic_key       TEXT         NOT NULL,                     -- matches Q1 taxonomy
  length_bucket   TEXT         NOT NULL CHECK (length_bucket IN ('flash','worldwide')),
  region_code     TEXT         NOT NULL,                     -- ISO 3166-1 alpha-2
  time_horizon    TEXT         NOT NULL CHECK (time_horizon IN ('breaking','aftermath','evergreen')),
  tone            TEXT         NOT NULL CHECK (tone IN
                                ('analytical','human_interest','numbers_heavy',
                                 'explainer','literary','profile')),

  display_order   INT          NOT NULL,                     -- stable order in picker UI
  body_excerpt    TEXT,                                      -- 1–3 sentences for the card

  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

----------------------------------------------------------------------
-- 4. Seed the 12 articles (6 topics × 2 lengths, with cross-axis variance).
----------------------------------------------------------------------
INSERT INTO rigwire.onboarding_seed_articles
  (id, headline, dek, source_label,
   topic_key, length_bucket, region_code, time_horizon, tone,
   display_order, body_excerpt) VALUES

  ('seed-01',
   'India sanctions Pakistani military officials over Kashmir incursion',
   'New Delhi names twelve ISI officers; visa revocations effective today.',
   'The Hindu',
   'world', 'flash', 'IN', 'breaking', 'analytical', 1,
   'The Ministry of External Affairs invoked Section 3 of the Foreign Contribution Act, naming twelve officers of the Inter-Services Intelligence directorate as personae non gratae.'),

  ('seed-02',
   'A year after the floods, Dresden''s bookshops are still drying out',
   'The waters receded. The Bauhaus archive did not.',
   'Süddeutsche Zeitung',
   'world', 'worldwide', 'DE', 'aftermath', 'human_interest', 2,
   'On the seventh of August, the Elbe crested at 7.8 metres — a number that means nothing to anyone who was not standing on a Dresden pavement that morning. To those who were, it means the smell of wet leather, of paper turning to clay, of a city''s memory liquefying.'),

  ('seed-03',
   'Fed holds rates; dollar drops 0.4%, S&P futures up 22 points',
   'Powell signals patience as inflation cools; markets price September cut at 64%.',
   'Bloomberg',
   'markets', 'flash', 'US', 'breaking', 'numbers_heavy', 3,
   'The Federal Reserve held its benchmark rate at 4.50%, with seven of nine FOMC members favouring a hold. The dollar index fell 0.4% to 102.18; gold rose $14 to $2,341.'),

  ('seed-04',
   'How M-Pesa quietly became Africa''s banking backbone',
   'Safaricom CEO Peter Ndegwa on the next decade of agency banking and Pan-African expansion.',
   'The Africa Report',
   'business', 'worldwide', 'KE', 'aftermath', 'profile', 4,
   'In a Nairobi conference room overlooking Uhuru Park, Peter Ndegwa speaks the way the company''s product reads — measured, almost flat. M-Pesa now moves more daily volume than Visa across thirteen African economies.'),

  ('seed-05',
   'OpenAI''s new model can solve high-school physics. Here''s what that means.',
   'Three benchmarks, two surprises, one open question about the next year.',
   'The Verge',
   'ai', 'flash', 'US', 'breaking', 'explainer', 5,
   'GPT-6 was announced this morning. Beneath the marketing — and there is a lot of it — sit three numbers that matter, and one that does not.'),

  ('seed-06',
   'Two years after the chip-fab subsidies: India''s semiconductor dream has yielded one factory',
   'Modi''s ₹76,000 crore programme was supposed to draw the world. The world sent a packaging plant.',
   'The Ken',
   'tech', 'worldwide', 'IN', 'aftermath', 'analytical', 6,
   'When Prime Minister Modi announced the India Semiconductor Mission in December 2021, the press briefing held twelve cabinet secretaries and forty-three industry executives. Two years on, the achievement is one Tata-Powerchip facility in Dholera doing ATMP — assembly, testing, marking, packaging — but no fabrication.'),

  ('seed-07',
   'Amazon deforestation hits two-year low: 18% drop from 2024, INPE confirms',
   'Lula government touts enforcement gains; satellite data shows clearance down to 6,288 km².',
   'Folha de S.Paulo',
   'climate', 'flash', 'BR', 'breaking', 'numbers_heavy', 7,
   'INPE''s PRODES system, which measures forest loss across the legal Amazon, recorded 6,288 km² of clearance in the year ending July 31 — an 18% reduction from the 7,672 km² registered in the same period the previous year.'),

  ('seed-08',
   'After the heat dome: how five British villages adapted, one by one',
   'Boddington''s pub installed an ice machine. Lower Slaughter rebuilt its bridge in concrete. The story is what each chose first.',
   'The Guardian',
   'climate', 'worldwide', 'GB', 'aftermath', 'human_interest', 8,
   'The summer of 2025 broke the United Kingdom''s climate consensus in a particular way: not at the level of policy, where it had already been broken, but at the level of villages, where the policy lands.'),

  ('seed-09',
   'Why Letterboxd became the social network for film lovers',
   'A New Zealand side project, a viewer migration, and the small-tent economics of taste.',
   'The New York Times',
   'film', 'flash', 'US', 'evergreen', 'explainer', 9,
   'Letterboxd was built by two friends in Auckland in 2011 to scratch their own itch. Fourteen years later it has fifteen million users and a particular cultural weight — the place film criticism actually happens online.'),

  ('seed-10',
   'Devdutt Pattanaik on the mythology India tells itself about itself',
   'A long conversation with the country''s most-read mythologist on what changes when a nation rewrites its origin story.',
   'The Caravan',
   'books', 'worldwide', 'IN', 'evergreen', 'literary', 10,
   'There is a manner in which Devdutt Pattanaik begins a sentence — softly, as if testing whether the listener has come to listen — that telegraphs the shape of what follows. He has written thirty-two books on Indian mythology. The thirty-third, he says, will be the one he has been avoiding.'),

  ('seed-11',
   'China reports first human case of new bird-flu variant; WHO monitoring',
   'H5N7 detected in Anhui province poultry worker; no human-to-human transmission confirmed.',
   'Reuters',
   'health', 'flash', 'CN', 'breaking', 'analytical', 11,
   'The case, a 47-year-old farmworker in Hefei prefecture, was hospitalised on Tuesday and remains in stable condition. WHO field teams have been notified; cluster surveillance has begun across three neighbouring counties.'),

  ('seed-12',
   'The opioid settlements arrived. So why is Ohio still burying its kids?',
   'Six billion dollars, thirty-five state agencies, one mother''s afternoon at the county morgue.',
   'The Atlantic',
   'health', 'worldwide', 'US', 'aftermath', 'human_interest', 12,
   'On a Tuesday in March, Karen Mancuso drove her son''s body from the Trumbull County coroner''s office to the funeral home in Niles, a route she had driven five times before for other people''s sons. By the time she was driving it for her own, the State of Ohio had received $810 million in opioid settlement funds.');

----------------------------------------------------------------------
-- 5. End.
----------------------------------------------------------------------
COMMIT;
