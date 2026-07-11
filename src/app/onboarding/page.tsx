// src/app/onboarding/page.tsx
//
// Server entry point for /onboarding.
// Fetches the 12 preset seed articles for the Q5 cold-start picker
// + the user's existing partial answers (if any) and hands them to
// the client flow as props. No client-side DB calls.

import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { sql, withUser } from '@/lib/db';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export const metadata: Metadata = {
  title:       'Set up your reading · Rig Wire',
  description: 'A short brief from the editor before your first edition.',
};

// Seed articles are public reference data owned by rigwire_app.
// No RLS on this table — every user sees the same 12 rows — so we
// can read it with the rigwire_app client without setting app.user_id.
async function loadSeedArticles() {
  return sql<{
    id: string;
    headline: string;
    dek: string;
    source_label: string;
    topic_key: string;
    length_bucket: 'flash' | 'worldwide';
    region_code: string;
    time_horizon: 'breaking' | 'aftermath' | 'evergreen';
    tone: string;
    body_excerpt: string | null;
  }[]>`
    SELECT id, headline, dek, source_label,
           topic_key, length_bucket, region_code, time_horizon, tone,
           body_excerpt
      FROM rigwire.onboarding_seed_articles
     ORDER BY display_order ASC
  `;
}

async function loadExistingProgress(userId: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx<{
      topics: string[];
      reader_intents: string[];
      delivery_window: string | null;
      delivery_frequency: string | null;
      seed_picks: string[];
      seed_skipped: string[];
      primary_region: string | null;
      secondary_regions: string[];
      voice_preference: string | null;
      signup_intent: string | null;
    }[]>`
      SELECT topics, reader_intents,
             delivery_window, delivery_frequency,
             seed_picks, seed_skipped,
             primary_region, secondary_regions,
             voice_preference, signup_intent
        FROM rigwire.user_preferences
       WHERE user_id = ${userId}
       LIMIT 1
    `;
    return rows[0] ?? null;
  });
}

export default async function OnboardingPage() {
  const session = await auth();
  // Middleware guarantees a session at this point — but be defensive.
  if (!session?.user?.id) {
    return null;
  }

  const [seedArticles, existing] = await Promise.all([
    loadSeedArticles(),
    loadExistingProgress(session.user.id),
  ]);

  return (
    <OnboardingFlow
      seedArticles={seedArticles}
      initialAnswers={existing}
    />
  );
}
