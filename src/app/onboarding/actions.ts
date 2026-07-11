// src/app/onboarding/actions.ts
//
// Server actions for the onboarding flow.
//
//   saveOnboardingProgress  → UPSERTs whatever fields the user has
//                             answered so far. Called after each
//                             step's "Next" so a refresh / device-
//                             switch resumes with answers intact.
//
//   completeOnboarding      → UPSERTs the final state + flips
//                             onboarded_at = NOW(). The CHECK
//                             constraint on user_preferences fails
//                             the INSERT if any required field is
//                             still NULL — so the gate cannot be
//                             cleared without a real answer set.
//                             Then refreshes the JWT via
//                             unstable_update() so the middleware
//                             stops redirecting to /onboarding.
//
// All UPSERTs run inside withUser(userId, ...) — that SETs
// app.user_id for the duration of the transaction so RLS WITH CHECK
// is satisfied.

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth, unstable_update } from '@/lib/auth';
import { withUser } from '@/lib/db';

// ============================================================
// Schemas
// ============================================================

const READER_INTENTS   = ['quick_morning','deep_read','breaking_only','across_sides','weekend_reader'] as const;
const DELIVERY_WINDOWS = ['morning','lunch','evening','bedtime'] as const;
const DELIVERY_FREQS   = ['daily_only','daily_plus_breaking','breaking_only','web_only'] as const;
const VOICES           = ['wire','newsroom','magazine','briefing','voice'] as const;
const INTENTS          = ['better_habit','less_doomscroll','follow_stories','no_slant','curious'] as const;

const ProgressSchema = z.object({
  topics:             z.array(z.string()).max(8).optional(),
  reader_intents:     z.array(z.enum(READER_INTENTS)).optional(),
  delivery_window:    z.enum(DELIVERY_WINDOWS).optional().nullable(),
  delivery_frequency: z.enum(DELIVERY_FREQS).optional().nullable(),
  seed_picks:         z.array(z.string()).max(5).optional(),
  seed_skipped:       z.array(z.string()).max(12).optional(),
  primary_region:     z.string().length(2).optional().nullable(),
  secondary_regions:  z.array(z.string().length(2)).optional(),
  voice_preference:   z.enum(VOICES).optional().nullable(),
  signup_intent:      z.enum(INTENTS).optional().nullable(),
  locale:             z.string().min(2).max(20).optional(),
  timezone:           z.string().min(3).max(64).optional(),
});

const CompleteSchema = z.object({
  topics:             z.array(z.string()).min(3).max(8),
  reader_intents:     z.array(z.enum(READER_INTENTS)),
  delivery_window:    z.enum(DELIVERY_WINDOWS),
  delivery_frequency: z.enum(DELIVERY_FREQS),
  seed_picks:         z.array(z.string()).length(5),
  seed_skipped:       z.array(z.string()),
  primary_region:     z.string().length(2),
  secondary_regions:  z.array(z.string().length(2)),
  voice_preference:   z.enum(VOICES),
  signup_intent:      z.enum(INTENTS),
  locale:             z.string().min(2).max(20),
  timezone:           z.string().min(3).max(64),
});

export type OnboardingProgress = z.infer<typeof ProgressSchema>;
export type OnboardingFinal    = z.infer<typeof CompleteSchema>;

// ============================================================
// Save partial progress (idempotent, called after each step)
// ============================================================

/**
 * UPSERT the columns the user has provided so far. Omitted columns
 * keep their existing value (for an existing row) or fall back to
 * the column default (for a brand-new row inserted by signup).
 *
 * Strategy: always include every column in the INSERT, sending the
 * known-good default ('' empty array, 'en', 'UTC', NULL) when the
 * caller didn't provide a value. The ON CONFLICT clause then uses
 * COALESCE so existing values aren't clobbered by these placeholders.
 */
export async function saveOnboardingProgress(
  raw: OnboardingProgress,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const parsed = ProgressSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const v = parsed.data;
  const userId = session.user.id;

  // Defaults match the column defaults from migration 0013.
  const topics             = v.topics             ?? [];
  const readerIntents      = v.reader_intents     ?? [];
  const seedPicks          = v.seed_picks         ?? [];
  const seedSkipped        = v.seed_skipped       ?? [];
  const secondaryRegions   = v.secondary_regions  ?? [];
  const locale             = v.locale             ?? 'en';
  const timezone           = v.timezone           ?? 'UTC';
  const deliveryWindow     = v.delivery_window    ?? null;
  const deliveryFrequency  = v.delivery_frequency ?? null;
  const primaryRegion      = v.primary_region     ?? null;
  const voicePreference    = v.voice_preference   ?? null;
  const signupIntent       = v.signup_intent      ?? null;

  // Per-field "did the caller actually provide this?" — drives the
  // ON CONFLICT update so we don't blank out a previously-set value
  // when the caller posts a partial update that omits it.
  const setTopics            = v.topics             !== undefined;
  const setReaderIntents     = v.reader_intents     !== undefined;
  const setSeedPicks         = v.seed_picks         !== undefined;
  const setSeedSkipped       = v.seed_skipped       !== undefined;
  const setSecondaryRegions  = v.secondary_regions  !== undefined;
  const setLocale            = v.locale             !== undefined;
  const setTimezone          = v.timezone           !== undefined;
  const setDeliveryWindow    = v.delivery_window    !== undefined;
  const setDeliveryFrequency = v.delivery_frequency !== undefined;
  const setPrimaryRegion     = v.primary_region     !== undefined;
  const setVoicePreference   = v.voice_preference   !== undefined;
  const setSignupIntent      = v.signup_intent      !== undefined;

  await withUser(userId, async (tx) => {
    await tx`
      INSERT INTO rigwire.user_preferences (
        user_id,
        topics,             reader_intents,
        delivery_window,    delivery_frequency,
        seed_picks,         seed_skipped,
        primary_region,     secondary_regions,
        voice_preference,   signup_intent,
        locale,             timezone,
        updated_at
      ) VALUES (
        ${userId},
        ${topics},          ${readerIntents},
        ${deliveryWindow},  ${deliveryFrequency},
        ${seedPicks},       ${seedSkipped},
        ${primaryRegion},   ${secondaryRegions},
        ${voicePreference}, ${signupIntent},
        ${locale},          ${timezone},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        topics              = CASE WHEN ${setTopics}            THEN EXCLUDED.topics             ELSE rigwire.user_preferences.topics             END,
        reader_intents      = CASE WHEN ${setReaderIntents}     THEN EXCLUDED.reader_intents     ELSE rigwire.user_preferences.reader_intents     END,
        delivery_window     = CASE WHEN ${setDeliveryWindow}    THEN EXCLUDED.delivery_window    ELSE rigwire.user_preferences.delivery_window    END,
        delivery_frequency  = CASE WHEN ${setDeliveryFrequency} THEN EXCLUDED.delivery_frequency ELSE rigwire.user_preferences.delivery_frequency END,
        seed_picks          = CASE WHEN ${setSeedPicks}         THEN EXCLUDED.seed_picks         ELSE rigwire.user_preferences.seed_picks         END,
        seed_skipped        = CASE WHEN ${setSeedSkipped}       THEN EXCLUDED.seed_skipped       ELSE rigwire.user_preferences.seed_skipped       END,
        primary_region      = CASE WHEN ${setPrimaryRegion}     THEN EXCLUDED.primary_region     ELSE rigwire.user_preferences.primary_region     END,
        secondary_regions   = CASE WHEN ${setSecondaryRegions}  THEN EXCLUDED.secondary_regions  ELSE rigwire.user_preferences.secondary_regions  END,
        voice_preference    = CASE WHEN ${setVoicePreference}   THEN EXCLUDED.voice_preference   ELSE rigwire.user_preferences.voice_preference   END,
        signup_intent       = CASE WHEN ${setSignupIntent}      THEN EXCLUDED.signup_intent      ELSE rigwire.user_preferences.signup_intent      END,
        locale              = CASE WHEN ${setLocale}            THEN EXCLUDED.locale             ELSE rigwire.user_preferences.locale             END,
        timezone            = CASE WHEN ${setTimezone}          THEN EXCLUDED.timezone           ELSE rigwire.user_preferences.timezone           END,
        updated_at          = NOW()
    `;
  });

  return { ok: true };
}

// ============================================================
// Final completion (flips onboarded_at + refreshes JWT)
// ============================================================

/**
 * Validates the full answer set, writes everything in one row,
 * flips onboarded_at to NOW(). The DB CHECK on user_preferences
 * ensures onboarded_at can only be set when all required answers
 * are populated — so a malicious caller who skips fields cannot
 * clear the gate.
 *
 * After the write, refreshes the JWT via unstable_update() so the
 * middleware sees the new flag immediately, then redirects to /today.
 */
export async function completeOnboarding(
  raw: OnboardingFinal,
): Promise<{ ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Not signed in.' };

  const parsed = CompleteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Some required answers are missing.' };
  }
  const v = parsed.data;
  const userId = session.user.id;

  const onboardedAt = await withUser(userId, async (tx) => {
    const rows = await tx<{ onboarded_at: Date }[]>`
      INSERT INTO rigwire.user_preferences (
        user_id,
        topics,             reader_intents,
        delivery_window,    delivery_frequency,
        seed_picks,         seed_skipped,
        primary_region,     secondary_regions,
        voice_preference,   signup_intent,
        locale,             timezone,
        onboarded_at,       updated_at
      ) VALUES (
        ${userId},
        ${v.topics},          ${v.reader_intents},
        ${v.delivery_window}, ${v.delivery_frequency},
        ${v.seed_picks},      ${v.seed_skipped},
        ${v.primary_region},  ${v.secondary_regions},
        ${v.voice_preference}, ${v.signup_intent},
        ${v.locale},          ${v.timezone},
        NOW(),                NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        topics              = EXCLUDED.topics,
        reader_intents      = EXCLUDED.reader_intents,
        delivery_window     = EXCLUDED.delivery_window,
        delivery_frequency  = EXCLUDED.delivery_frequency,
        seed_picks          = EXCLUDED.seed_picks,
        seed_skipped        = EXCLUDED.seed_skipped,
        primary_region      = EXCLUDED.primary_region,
        secondary_regions   = EXCLUDED.secondary_regions,
        voice_preference    = EXCLUDED.voice_preference,
        signup_intent       = EXCLUDED.signup_intent,
        locale              = EXCLUDED.locale,
        timezone            = EXCLUDED.timezone,
        onboarded_at        = NOW(),
        updated_at          = NOW()
      RETURNING onboarded_at
    `;
    return rows[0].onboarded_at;
  });

  // Refresh the JWT so middleware sees the new flag without sign-out.
  await unstable_update({
    user: { onboardedAt: onboardedAt.toISOString() },
  });

  redirect('/today');
}
