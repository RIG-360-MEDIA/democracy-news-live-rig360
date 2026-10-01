// Editorial CMS — zod schemas for the Studio write routes (L1).
//
// Every write route parses its JSON body here BEFORE touching the DB: ids must be uuids, numbers are
// bounded integers, free text is length-capped and image URLs must be absolute http(s). Client-safe
// (zod + constants only) so forms can share the limits.
import { z } from 'zod';

import { MAX_REORDER } from './pins';
import { MANUAL_TOPICS, type ManualTopic } from './topics';

export const INPUT_LIMITS = {
  headline: 300,
  dek: 1_000,
  body: 100_000,
  tags: 50,
  tag: 80,
  url: 2_048,
  reason: 500,
  country: 64,
  maxPinRank: MAX_REORDER, // a pin forces a Top Stories slot (F10) — ranks beyond it can't be shown
  maxImportanceDelta: 100,
  maxImportance: 100,
} as const;

const DEFAULT_IMPORTANCE = 40;
const HTTP_URL = /^https?:\/\/\S+$/i;

export const storyIdSchema = z.guid();

/** '' (clear) or an absolute http(s) URL. */
const imageUrl = z
  .string()
  .trim()
  .max(INPUT_LIMITS.url)
  .refine((v) => v === '' || HTTP_URL.test(v), { message: 'Image must be an http(s) URL' });

export const OVERRIDE_KINDS = ['publish', 'unpublish', 'unpin', 'kill', 'revive', 'pin', 'boost', 'lock'] as const;

export const overrideSchema = z.object({
  storyId: storyIdSchema,
  kind: z.enum(OVERRIDE_KINDS),
  reason: z.string().trim().max(INPUT_LIMITS.reason).optional(),
  rank: z.number().int().min(1).max(INPUT_LIMITS.maxPinRank).default(1),
  delta: z.number().int().min(-INPUT_LIMITS.maxImportanceDelta).max(INPUT_LIMITS.maxImportanceDelta).default(0),
  locked: z.boolean().default(false),
});
export type OverrideInput = z.infer<typeof overrideSchema>;

export const editSchema = z
  .object({
    storyId: storyIdSchema,
    headline: z.string().max(INPUT_LIMITS.headline).optional(),
    dek: z.string().max(INPUT_LIMITS.dek).optional(),
    body: z.string().max(INPUT_LIMITS.body).optional(),
    tags: z.array(z.string().max(INPUT_LIMITS.tag)).max(INPUT_LIMITS.tags).optional(),
    image: imageUrl.optional(),
  })
  .refine(
    (v) => [v.headline, v.dek, v.body, v.tags, v.image].some((f) => f !== undefined),
    { message: 'No fields to edit' },
  );
export type EditInput = z.infer<typeof editSchema>;

/** Optional free text: absent/null/blank → null, otherwise trimmed and capped. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const createSchema = z.object({
  headline: requiredText(INPUT_LIMITS.headline),
  body: requiredText(INPUT_LIMITS.body),
  dek: optionalText(INPUT_LIMITS.dek),
  country: optionalText(INPUT_LIMITS.country),
  image_url: imageUrl.nullish().transform((v) => (v ? v : null)),
  // Unknown topics fall back to OTHER (historic behaviour; the form only offers valid ones).
  topic: z
    .unknown()
    .optional()
    .transform((v): ManualTopic =>
      typeof v === 'string' && (MANUAL_TOPICS as readonly string[]).includes(v) ? (v as ManualTopic) : 'OTHER',
    ),
  // The form sends Number('') → NaN → JSON null when blank; that keeps the default.
  importance: z
    .number()
    .min(0)
    .max(INPUT_LIMITS.maxImportance)
    .nullish()
    .transform((v) => v ?? DEFAULT_IMPORTANCE),
});
export type CreateInput = z.infer<typeof createSchema>;

/** PATCH /api/studio/manual/[id] (F9): any subset of the editable fields and/or a publish-state flip.
 *  Deleting is NOT possible here — it is the admin-only DELETE. Unknown keys are rejected. */
export const manualPatchSchema = z
  .object({
    headline: requiredText(INPUT_LIMITS.headline).optional(),
    body: requiredText(INPUT_LIMITS.body).optional(),
    dek: optionalText(INPUT_LIMITS.dek).optional(),
    country: optionalText(INPUT_LIMITS.country).optional(),
    image_url: imageUrl
      .nullable()
      .transform((v) => (v ? v : null))
      .optional(),
    topic: z.enum(MANUAL_TOPICS).optional(),
    importance: z.number().min(0).max(INPUT_LIMITS.maxImportance).optional(),
    status: z.enum(['PUBLISHABLE', 'UNPUBLISHED']).optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((f) => f !== undefined), { message: 'Nothing to change' });
export type ManualPatchInput = z.infer<typeof manualPatchSchema>;
