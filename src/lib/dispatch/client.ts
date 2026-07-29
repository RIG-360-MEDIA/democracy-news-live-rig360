// Draftsmith (Door B) dispatch client — the CMS's one gateway to the box's
// draft-jobs API (backend/draftsmith). Server-only: reads BOX_STUDIO_URL +
// BOX_STUDIO_TOKEN, which must never reach the browser bundle.
//
// Mock mode: when BOX_STUDIO_URL is unset or the literal string 'mock', every
// call is served from ./mock/handlers (backed by ./mock/fixtures) so the
// Studio UI and E2E tests work with no box running.
//
// Every response — box or mock — is parsed through the zod schemas in
// ./types before it reaches a caller. That is the drift guard: if the box
// (or a stale fixture) stops matching backend/draftsmith/models.py, this
// throws instead of handing bad shapes to the UI.

import 'server-only';

import { z } from 'zod';

import * as mock from './mock/handlers';
import {
  apiResponseSchema,
  draftBundleSchema,
  finalizePayloadSchema,
  flagSchema,
  imageCandidateSchema,
  jobStatusSchema,
} from './types';

import type { MockResponse } from './mock/handlers';
import type {
  CreateJobRequest,
  DraftBundle,
  FinalizePayload,
  Flag,
  ImageCandidate,
  JobStatus,
  ResolveFlagRequest,
  SaveEditRequest,
} from './types';

/** Thrown for every failed dispatch call — box error, mock error, or a
 * response that failed contract validation. `status` is an HTTP-style code
 * callers can forward verbatim (e.g. the box's 422 on a semantic finalize
 * failure). */
export class DispatchError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'DispatchError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function useMock(): boolean {
  const url = process.env.BOX_STUDIO_URL;
  return !url || url === 'mock';
}

/**
 * True when a REAL box is configured (not mock mode). Door B UI + publishing gate on this so
 * production never serves — or worse, publishes — fixture drafts as if they were real stories.
 */
export function isDispatchLive(): boolean {
  return !useMock();
}

function boxUrl(): string {
  const url = process.env.BOX_STUDIO_URL;
  if (!url || url === 'mock') {
    throw new DispatchError('config', 'BOX_STUDIO_URL is not configured for a live box call', 500);
  }
  return url.replace(/\/+$/, '');
}

/** Parse a wire envelope ({ status, json }) through `schema`, throwing a
 * DispatchError on either a validation failure or an { ok: false } body. */
function unwrap<T>(schema: z.ZodType<T>, raw: { status: number; json: unknown }): T {
  const parsed = apiResponseSchema(schema).safeParse(raw.json);
  if (!parsed.success) {
    throw new DispatchError('bad_gateway', 'Response failed contract validation', 502, parsed.error.flatten());
  }
  const body = parsed.data;
  if (!body.ok || body.data === null) {
    const status = raw.status >= 400 ? raw.status : 502;
    throw new DispatchError(body.error?.code ?? 'unknown_error', body.error?.message ?? 'Request failed', status, body.error?.details);
  }
  return body.data;
}

async function callBox<T>(
  path: string,
  schema: z.ZodType<T>,
  editorId: string,
  init?: RequestInit,
): Promise<T> {
  const token = process.env.BOX_STUDIO_TOKEN;
  if (!token) throw new DispatchError('config', 'BOX_STUDIO_TOKEN is not configured', 500);

  const res = await fetch(`${boxUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Editor-Id': editorId,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new DispatchError('bad_gateway', `Box returned non-JSON (HTTP ${res.status})`, 502);
  }
  return unwrap(schema, { status: res.status, json });
}

async function callMock<T>(schema: z.ZodType<T>, call: Promise<MockResponse>): Promise<T> {
  const raw = await call;
  return unwrap(schema, { status: raw.status, json: raw.body });
}

// ─── Live-box adapters ───────────────────────────────────────────────────────
// The deployed box returns raw DB rows (id + snake internals) and splits the review
// bundle across separate endpoints. These map its real responses onto the wire
// contract (types.ts) before validation, so the CMS UI stays unchanged.

/** Call the box, unwrap the { ok, data, error } envelope, return raw `data` (no schema). */
async function callBoxRaw(path: string, editorId: string, init?: RequestInit): Promise<unknown> {
  const token = process.env.BOX_STUDIO_TOKEN;
  if (!token) throw new DispatchError('config', 'BOX_STUDIO_TOKEN is not configured', 500);
  const res = await fetch(`${boxUrl()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Editor-Id': editorId, ...init?.headers },
    cache: 'no-store',
  });
  let json: { ok?: boolean; data?: unknown; error?: { code?: string; message?: string; details?: unknown } };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new DispatchError('bad_gateway', `Box returned non-JSON (HTTP ${res.status})`, 502);
  }
  if (!json || json.ok !== true || json.data == null) {
    const status = res.status >= 400 ? res.status : 502;
    throw new DispatchError(json?.error?.code ?? 'unknown_error', json?.error?.message ?? 'Request failed', status, json?.error?.details);
  }
  return json.data;
}

/** Box job row (id + internals) → wire JobStatus (job_id + curated subset). */
function toJobStatus(raw: Record<string, unknown>): JobStatus {
  return jobStatusSchema.parse({
    job_id: raw.id,
    state: raw.state,
    phase_detail: raw.phase_detail ?? null,
    headline: raw.headline ?? null,
    created_by: raw.created_by,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  });
}

/** Box may store the resolve action verbatim ('dismiss'); the wire status enum is 'dismissed'. */
function wireFlagStatus(status: unknown): unknown {
  return status === 'dismiss' ? 'dismissed' : status;
}

export async function createJob(req: CreateJobRequest, editorId: string): Promise<JobStatus> {
  if (useMock()) return callMock(jobStatusSchema, mock.createJob(req, editorId));
  const raw = await callBoxRaw('/jobs', editorId, {
    method: 'POST',
    body: JSON.stringify({ input_text: req.input_text, dials: req.dials }),
  });
  return toJobStatus(raw as Record<string, unknown>);
}

export async function listJobs(ids: string[] | undefined, editorId: string): Promise<JobStatus[]> {
  if (useMock()) return callMock(z.array(jobStatusSchema), mock.listJobs(ids, editorId));
  // Box GET /jobs has no id filter — scope to this editor, then filter to requested ids client-side.
  const raw = (await callBoxRaw(`/jobs?created_by=${encodeURIComponent(editorId)}&limit=200`, editorId)) as Record<string, unknown>[];
  const out = raw.map(toJobStatus);
  if (ids && ids.length > 0) {
    const want = new Set(ids);
    return out.filter((j) => want.has(j.job_id));
  }
  return out;
}

export async function getJob(jobId: string, editorId: string): Promise<DraftBundle> {
  if (useMock()) return callMock(draftBundleSchema, mock.getJob(jobId, editorId));
  // The box splits the bundle across endpoints — job status, draft (nested), flags, images, evidence.
  const id = encodeURIComponent(jobId);
  const [job, draftResp, flagsRaw, imagesRaw, evidenceRaw] = (await Promise.all([
    callBoxRaw(`/jobs/${id}`, editorId),
    callBoxRaw(`/jobs/${id}/draft`, editorId),
    callBoxRaw(`/jobs/${id}/flags`, editorId),
    callBoxRaw(`/jobs/${id}/images`, editorId),
    callBoxRaw(`/jobs/${id}/evidence`, editorId),
  ])) as [
    Record<string, unknown>,
    { version: { draft: Record<string, unknown> } },
    Record<string, unknown>[],
    Record<string, unknown>[],
    Record<string, unknown>[],
  ];
  const draft = draftResp.version.draft;
  // The box returns the whole gather corpus; keep only evidence the draft actually cites.
  const cited = new Set<string>();
  const collect = (arr: unknown) => {
    for (const item of (arr as { source_ids?: string[] }[] | undefined) ?? []) for (const s of item.source_ids ?? []) cited.add(s);
  };
  collect(draft.beats);
  collect(draft.key_facts);
  const pq = draft.pull_quote as { source_id?: string } | null;
  if (pq?.source_id) cited.add(pq.source_id);
  const evidence = evidenceRaw
    .filter((e) => cited.has(e.source_id as string))
    .map((e) => ({
      source_id: e.source_id,
      source_type: e.source_type,
      trust_tier: e.trust_tier,
      title: e.title ?? null,
      url: e.url ?? null,
      outlet: e.outlet ?? null,
      snippet: e.text ?? '',
      published_at: e.published_at ?? null,
    }));
  return draftBundleSchema.parse({
    job_id: job.id,
    state: job.state,
    dials: job.dials,
    draft,
    flags: flagsRaw.map((f) => ({ ...f, status: wireFlagStatus(f.status) })),
    evidence,
    images: imagesRaw,
  });
}

export async function saveEdit(jobId: string, req: SaveEditRequest, editorId: string): Promise<DraftBundle> {
  if (useMock()) return callMock(draftBundleSchema, mock.saveEdit(jobId, req, editorId));
  // Box /edit needs the FULL draft; merge the editor's beats/headline/dek onto the current version.
  const id = encodeURIComponent(jobId);
  const cur = ((await callBoxRaw(`/jobs/${id}/draft`, editorId)) as { version: { draft: Record<string, unknown> } }).version.draft;
  const beats = (req.beats ?? []).map((b) => ({ subhead: b.subhead, text: b.text, source_ids: b.source_ids ?? [] }));
  await callBoxRaw(`/jobs/${id}/edit`, editorId, {
    method: 'POST',
    body: JSON.stringify({
      headline: req.headline ?? cur.headline,
      dek: req.dek ?? cur.dek,
      beats,
      key_facts: cur.key_facts ?? [],
      pull_quote: cur.pull_quote ?? null,
      unsourced_gaps: cur.unsourced_gaps ?? [],
    }),
  });
  return getJob(jobId, editorId);
}

export async function resolveFlag(
  jobId: string,
  flagId: string,
  req: ResolveFlagRequest,
  editorId: string,
): Promise<Flag> {
  if (useMock()) return callMock(flagSchema, mock.resolveFlag(jobId, flagId, req, editorId));
  // Box expects the resolved STATUS ('dismissed' | 'fixed'); the CMS action verb is 'dismiss' | 'fixed'.
  const action = req.action === 'dismiss' ? 'dismissed' : req.action;
  const raw = (await callBoxRaw(`/jobs/${encodeURIComponent(jobId)}/flags/${encodeURIComponent(flagId)}`, editorId, {
    method: 'POST',
    body: JSON.stringify({ action, note: req.note }),
  })) as Record<string, unknown>;
  return flagSchema.parse({ ...raw, status: wireFlagStatus(raw.status) });
}

export async function regenerate(jobId: string, editorId: string): Promise<JobStatus> {
  if (useMock()) return callMock(jobStatusSchema, mock.regenerate(jobId, editorId));
  return callBox(`/jobs/${encodeURIComponent(jobId)}/regenerate`, jobStatusSchema, editorId, { method: 'POST' });
}

export async function pickThumbnail(jobId: string, imageId: string, editorId: string): Promise<ImageCandidate[]> {
  if (useMock()) return callMock(z.array(imageCandidateSchema), mock.pickThumbnail(jobId, imageId, editorId));
  return callBox(
    `/jobs/${encodeURIComponent(jobId)}/images/${encodeURIComponent(imageId)}/select`,
    z.array(imageCandidateSchema),
    editorId,
    { method: 'POST' },
  );
}

export async function finalize(jobId: string, editorId: string): Promise<FinalizePayload> {
  if (useMock()) return callMock(finalizePayloadSchema, mock.finalize(jobId, editorId));
  const raw = await callBoxRaw(`/jobs/${encodeURIComponent(jobId)}/finalize`, editorId, { method: 'POST' });
  return finalizePayloadSchema.parse(raw);
}

const confirmPublishedResponseSchema = z.object({ acknowledged: z.boolean() });

export async function confirmPublished(jobId: string, storyId: string, editorId: string): Promise<void> {
  if (useMock()) {
    await callMock(confirmPublishedResponseSchema, mock.confirmPublished(jobId, storyId, editorId));
    return;
  }
  // Box path is /published and needs the draft version; fetch it, then confirm (best-effort).
  const id = encodeURIComponent(jobId);
  const cur = (await callBoxRaw(`/jobs/${id}/draft`, editorId)) as { version: { version: number } };
  await callBoxRaw(`/jobs/${id}/published`, editorId, {
    method: 'POST',
    body: JSON.stringify({ version: cur.version.version, neon_story_id: storyId }),
  });
}
