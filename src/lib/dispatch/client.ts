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

export async function createJob(req: CreateJobRequest, editorId: string): Promise<JobStatus> {
  if (useMock()) return callMock(jobStatusSchema, mock.createJob(req, editorId));
  return callBox('/jobs', jobStatusSchema, editorId, { method: 'POST', body: JSON.stringify(req) });
}

export async function listJobs(ids: string[] | undefined, editorId: string): Promise<JobStatus[]> {
  if (useMock()) return callMock(z.array(jobStatusSchema), mock.listJobs(ids, editorId));
  const qs = ids && ids.length > 0 ? `?ids=${ids.map(encodeURIComponent).join(',')}` : '';
  return callBox(`/jobs${qs}`, z.array(jobStatusSchema), editorId);
}

export async function getJob(jobId: string, editorId: string): Promise<DraftBundle> {
  if (useMock()) return callMock(draftBundleSchema, mock.getJob(jobId, editorId));
  return callBox(`/jobs/${encodeURIComponent(jobId)}`, draftBundleSchema, editorId);
}

export async function saveEdit(jobId: string, req: SaveEditRequest, editorId: string): Promise<DraftBundle> {
  if (useMock()) return callMock(draftBundleSchema, mock.saveEdit(jobId, req, editorId));
  return callBox(`/jobs/${encodeURIComponent(jobId)}`, draftBundleSchema, editorId, {
    method: 'PATCH',
    body: JSON.stringify(req),
  });
}

export async function resolveFlag(
  jobId: string,
  flagId: string,
  req: ResolveFlagRequest,
  editorId: string,
): Promise<Flag> {
  if (useMock()) return callMock(flagSchema, mock.resolveFlag(jobId, flagId, req, editorId));
  return callBox(`/jobs/${encodeURIComponent(jobId)}/flags/${encodeURIComponent(flagId)}`, flagSchema, editorId, {
    method: 'POST',
    body: JSON.stringify(req),
  });
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
  return callBox(`/jobs/${encodeURIComponent(jobId)}/finalize`, finalizePayloadSchema, editorId, { method: 'POST' });
}

const confirmPublishedResponseSchema = z.object({ acknowledged: z.boolean() });

export async function confirmPublished(jobId: string, storyId: string, editorId: string): Promise<void> {
  if (useMock()) {
    await callMock(confirmPublishedResponseSchema, mock.confirmPublished(jobId, storyId, editorId));
    return;
  }
  await callBox(
    `/jobs/${encodeURIComponent(jobId)}/confirm-publish`,
    confirmPublishedResponseSchema,
    editorId,
    { method: 'POST', body: JSON.stringify({ story_id: storyId }) },
  );
}
