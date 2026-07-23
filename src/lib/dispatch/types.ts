// Draftsmith (Door B) wire contract — the CMS's view of the box API.
//
// These zod schemas mirror backend/draftsmith/models.py 1:1 (snake_case wire
// keys deliberately kept identical to the Python dataclasses so drift is
// obvious in review). This file is the single CMS-side source of truth for the
// draft-jobs API; every proxy route parses box responses through it.
//
// Envelope follows .claude/rules/api-conventions.md — { ok, data, error }.

import { z } from 'zod';

// --- response envelope -------------------------------------------------------

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

/** Wrap any payload schema in the project envelope. */
export function apiResponseSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    ok: z.boolean(),
    data: data.nullable(),
    error: apiErrorSchema.nullable(),
    meta: z
      .object({
        traceId: z.string(),
        cachedAt: z.string().optional(),
        nextCursor: z.string().optional(),
      })
      .optional(),
  });
}

// --- dials (editor-set at generation time) -----------------------------------

export const dialsSchema = z.object({
  creativity: z.number().int().min(0).max(10),
  moxy: z.number().int().min(0).max(10),
  length_target: z.number().int().min(300).max(4000),
  spot_check: z.boolean(),
});
export type Dials = z.infer<typeof dialsSchema>;

export const DEFAULT_DIALS: Dials = {
  creativity: 5,
  moxy: 3,
  length_target: 1200,
  spot_check: true,
};

/** Editor-facing word-target presets for the Door B input screen. */
export const LENGTH_PRESETS = [800, 1200, 1800] as const;

// --- enumerations ------------------------------------------------------------

export const jobStateSchema = z.enum([
  'queued', 'planning', 'gathering', 'ranking', 'drafting',
  'verifying', 'repairing', 'images', 'ready',
  'failed', 'cancelled', 'published',
]);
export type JobState = z.infer<typeof jobStateSchema>;

/** States the review UI treats as still-working (keep polling). */
export const ACTIVE_STATES: readonly JobState[] = [
  'queued', 'planning', 'gathering', 'ranking', 'drafting', 'verifying', 'repairing', 'images',
];

export const sourceTypeSchema = z.enum([
  'corpus_article', 'story_fact', 'youtube_clip', 'web', 'wikipedia',
  'twitter', 'reddit', 'tiktok', 'telegram', 'instagram', 'wechat',
]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const trustTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type TrustTier = z.infer<typeof trustTierSchema>;

export const beatVerdictSchema = z.enum(['green', 'amber', 'red']);
export type BeatVerdict = z.infer<typeof beatVerdictSchema>;

export const severitySchema = z.enum(['red', 'amber']);
export const imageOriginSchema = z.enum(['corpus', 'wikimedia', 'web']);

// --- draft body --------------------------------------------------------------

export const draftBeatSchema = z.object({
  subhead: z.string(),
  text: z.string(),
  source_ids: z.array(z.string()),
  // present once VERIFY has run; drives the green/amber/red left edge in the UI
  confidence: beatVerdictSchema.optional(),
});
export type DraftBeat = z.infer<typeof draftBeatSchema>;

export const keyFactSchema = z.object({
  fact: z.string(),
  source_ids: z.array(z.string()),
});

export const pullQuoteSchema = z.object({
  text: z.string(),
  speaker: z.string(),
  source_id: z.string(),
});

export const draftSchema = z.object({
  headline: z.string(),
  dek: z.string(),
  beats: z.array(draftBeatSchema),
  key_facts: z.array(keyFactSchema),
  pull_quote: pullQuoteSchema.nullable(),
  unsourced_gaps: z.array(z.string()),
});
export type Draft = z.infer<typeof draftSchema>;

// --- evidence, flags, images -------------------------------------------------

export const evidenceRefSchema = z.object({
  source_id: z.string(),
  source_type: sourceTypeSchema,
  trust_tier: trustTierSchema,
  title: z.string().nullable(),
  url: z.string().nullable(),
  outlet: z.string().nullable(),
  snippet: z.string(),
  published_at: z.string().nullable(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const flagSchema = z.object({
  id: z.string(),
  beat_index: z.number().int(),
  span: z.string(),
  severity: severitySchema,
  reason: z.string(),
  source_ids: z.array(z.string()),
  status: z.enum(['open', 'dismissed', 'fixed']),
  resolved_by: z.string().nullable().optional(),
  resolution_note: z.string().nullable().optional(),
});
export type Flag = z.infer<typeof flagSchema>;

export const imageCandidateSchema = z.object({
  id: z.string(),
  slot: z.number().int().min(1).max(6),
  origin: imageOriginSchema,
  url: z.string(),
  thumb_url: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  attribution: z.string().nullable().optional(),
  needs_license_review: z.boolean(),
  selected: z.boolean(),
});
export type ImageCandidate = z.infer<typeof imageCandidateSchema>;

// --- job status (polling) ----------------------------------------------------

export const jobStatusSchema = z.object({
  job_id: z.string(),
  state: jobStateSchema,
  phase_detail: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** Full draft bundle — GET /jobs/{id}. */
export const draftBundleSchema = z.object({
  job_id: z.string(),
  state: jobStateSchema,
  dials: dialsSchema,
  draft: draftSchema,
  flags: z.array(flagSchema),
  evidence: z.array(evidenceRefSchema),
  images: z.array(imageCandidateSchema),
});
export type DraftBundle = z.infer<typeof draftBundleSchema>;

// --- request payloads (browser → CMS proxy; editor_id added server-side) -----

export const createJobRequestSchema = z.object({
  input_text: z.string().min(1).max(20_000),
  dials: dialsSchema.default(DEFAULT_DIALS),
  time_window_h: z.number().int().positive().optional(),
  region: z.string().optional(),
  section: z.string().optional(),
});
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;

export const saveEditRequestSchema = z.object({
  beats: z.array(draftBeatSchema),
  headline: z.string().optional(),
  dek: z.string().optional(),
});
export type SaveEditRequest = z.infer<typeof saveEditRequestSchema>;

// One flag per request — there is deliberately no bulk-resolve shape.
export const resolveFlagRequestSchema = z.object({
  action: z.enum(['dismiss', 'fixed']),
  note: z.string().max(2000).optional(),
});
export type ResolveFlagRequest = z.infer<typeof resolveFlagRequestSchema>;

export const finalizePayloadSchema = z.object({
  job_id: z.string(),
  version: z.number().int(),
  headline: z.string(),
  dek: z.string(),
  body_markdown: z.string(),
  topic: z.string(),
  country: z.string().nullable(),
  image_url: z.string().nullable(),
  importance_suggested: z.number(),
  flags_summary: z.object({
    resolved: z.number().int(),
    red: z.number().int(),
    amber: z.number().int(),
  }),
});
export type FinalizePayload = z.infer<typeof finalizePayloadSchema>;
