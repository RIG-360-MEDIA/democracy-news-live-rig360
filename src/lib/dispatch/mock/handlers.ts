// Draftsmith (Door B) mock backend — in-memory impls behind ../client.ts's mock
// mode, so the Studio UI and E2E tests work with no box running. Seeded from
// ./fixtures.ts. Each write replaces the whole store Map + record objects
// (never mutates a stored record in place) per the immutability rule.
//
// Every function returns a wire-shaped { status, body } pair — the same shape
// client.ts gets back from a real `fetch` against the box — so client.ts can
// run both branches through one zod-validated unwrap path.

import { randomUUID } from 'node:crypto';

import { MOCK_DRAFT_BUNDLES, MOCK_JOB_STATUSES } from './fixtures';

import type {
  CreateJobRequest,
  Draft,
  DraftBundle,
  EvidenceRef,
  FinalizePayload,
  Flag,
  ImageCandidate,
  JobStatus,
  ResolveFlagRequest,
  SaveEditRequest,
} from '../types';

export interface MockResponse {
  status: number;
  body: {
    ok: boolean;
    data: unknown;
    error: { code: string; message: string; details?: unknown } | null;
  };
}

function ok(data: unknown, status = 200): MockResponse {
  return { status, body: { ok: true, data, error: null } };
}

function fail(code: string, message: string, status: number, details?: unknown): MockResponse {
  return { status, body: { ok: false, data: null, error: { code, message, details } } };
}

interface JobRecord {
  status: JobStatus;
  bundle: DraftBundle | null;
  request: CreateJobRequest | null;
  version: number;
  publishedStoryId: string | null;
}

function seed(): Map<string, JobRecord> {
  const m = new Map<string, JobRecord>();
  for (const [id, status] of Object.entries(MOCK_JOB_STATUSES)) {
    m.set(id, {
      status,
      bundle: MOCK_DRAFT_BUNDLES[id] ?? null,
      request: null,
      version: 1,
      publishedStoryId: id === 'job-published' ? 'mock-story-published-1' : null,
    });
  }
  return m;
}

// Module-level store — fine for local dev/E2E (single process); never a stand-in
// for the box's real rigwire.draft_jobs, which is the actual source of truth.
let store = seed();

function renderBodyMarkdown(draft: Draft, evidence: EvidenceRef[]): string {
  const beats = draft.beats.map((b) => `## ${b.subhead}\n\n${b.text}`).join('\n\n');
  const usedIds = new Set(draft.beats.flatMap((b) => b.source_ids));
  const sources = evidence
    .filter((e) => usedIds.has(e.source_id))
    .map((e) => `- [${e.source_id}] ${e.title ?? e.outlet ?? e.source_type}${e.url ? ` — ${e.url}` : ''}`)
    .join('\n');
  return `${beats}\n\n## Sources\n\n${sources}`;
}

export async function createJob(req: CreateJobRequest, editorId: string): Promise<MockResponse> {
  const id = `job-mock-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const status: JobStatus = {
    job_id: id,
    state: 'queued',
    phase_detail: 'waiting for a worker',
    headline: null,
    created_by: editorId,
    created_at: now,
    updated_at: now,
  };
  store = new Map(store).set(id, { status, bundle: null, request: req, version: 1, publishedStoryId: null });
  return ok(status, 201);
}

export async function listJobs(ids: string[] | undefined, _editorId: string): Promise<MockResponse> {
  const all = Array.from(store.values()).map((r) => r.status);
  const filtered = ids && ids.length > 0 ? all.filter((s) => ids.includes(s.job_id)) : all;
  return ok(filtered);
}

export async function getJob(jobId: string, _editorId: string): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record) return fail('not_found', `Job ${jobId} not found`, 404);
  if (!record.bundle) {
    return fail('not_ready', `Job ${jobId} has no draft yet (state: ${record.status.state})`, 409);
  }
  return ok(record.bundle);
}

export async function saveEdit(
  jobId: string,
  req: SaveEditRequest,
  _editorId: string,
): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record || !record.bundle) return fail('not_found', `Job ${jobId} has no draft to edit`, 404);

  const nextDraft: Draft = {
    ...record.bundle.draft,
    headline: req.headline ?? record.bundle.draft.headline,
    dek: req.dek ?? record.bundle.draft.dek,
    beats: req.beats,
  };
  const nextBundle: DraftBundle = { ...record.bundle, draft: nextDraft };
  const nextStatus: JobStatus = { ...record.status, headline: nextDraft.headline, updated_at: new Date().toISOString() };
  store = new Map(store).set(jobId, { ...record, bundle: nextBundle, status: nextStatus, version: record.version + 1 });
  return ok(nextBundle);
}

export async function resolveFlag(
  jobId: string,
  flagId: string,
  req: ResolveFlagRequest,
  editorId: string,
): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record || !record.bundle) return fail('not_found', `Job ${jobId} has no draft`, 404);

  const target = record.bundle.flags.find((f) => f.id === flagId);
  if (!target) return fail('not_found', `Flag ${flagId} not found on job ${jobId}`, 404);
  if (target.status !== 'open') return fail('conflict', `Flag ${flagId} is already ${target.status}`, 409);

  const resolved: Flag = {
    ...target,
    status: req.action === 'dismiss' ? 'dismissed' : 'fixed',
    resolved_by: editorId,
    resolution_note: req.note ?? null,
  };
  const nextFlags = record.bundle.flags.map((f) => (f.id === flagId ? resolved : f));
  const nextBundle: DraftBundle = { ...record.bundle, flags: nextFlags };
  store = new Map(store).set(jobId, { ...record, bundle: nextBundle });
  return ok(resolved);
}

export async function regenerate(jobId: string, _editorId: string): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record) return fail('not_found', `Job ${jobId} not found`, 404);

  const nextStatus: JobStatus = {
    ...record.status,
    state: 'drafting',
    phase_detail: 're-drafting from the existing evidence bundle…',
    updated_at: new Date().toISOString(),
  };
  // Regenerate reruns drafting from the frozen evidence — the prior draft/flags are stale.
  store = new Map(store).set(jobId, { ...record, status: nextStatus, bundle: null });
  return ok(nextStatus);
}

export async function pickThumbnail(
  jobId: string,
  imageId: string,
  _editorId: string,
): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record || !record.bundle) return fail('not_found', `Job ${jobId} has no images`, 404);

  const target = record.bundle.images.find((i) => i.id === imageId);
  if (!target) return fail('not_found', `Image ${imageId} not found on job ${jobId}`, 404);

  // Single main thumbnail: selecting one clears any other selection.
  const nextImages = record.bundle.images.map((i) => ({ ...i, selected: i.id === imageId }));
  const nextBundle: DraftBundle = { ...record.bundle, images: nextImages };
  store = new Map(store).set(jobId, { ...record, bundle: nextBundle });
  return ok(nextImages);
}

export async function finalize(jobId: string, _editorId: string): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record || !record.bundle) return fail('not_found', `Job ${jobId} has no draft to finalize`, 404);

  const openRed = record.bundle.flags.filter((f) => f.status === 'open' && f.severity === 'red');
  if (openRed.length > 0) {
    return fail(
      'unresolved_red_flags',
      `${openRed.length} unresolved red flag(s) must be fixed or dismissed before publish.`,
      422,
      { flag_ids: openRed.map((f) => f.id) },
    );
  }

  const resolved = record.bundle.flags.filter((f) => f.status !== 'open').length;
  const red = record.bundle.flags.filter((f) => f.severity === 'red').length;
  const amber = record.bundle.flags.filter((f) => f.severity === 'amber').length;
  const selectedImage = record.bundle.images.find((i) => i.selected) ?? null;

  const payload: FinalizePayload = {
    job_id: jobId,
    version: record.version,
    headline: record.bundle.draft.headline,
    dek: record.bundle.draft.dek,
    body_markdown: renderBodyMarkdown(record.bundle.draft, record.bundle.evidence),
    topic: record.request?.section ?? 'GENERAL',
    country: record.request?.region ?? null,
    image_url: selectedImage?.url ?? null,
    importance_suggested: 55,
    flags_summary: { resolved, red, amber },
  };

  const nextStatus: JobStatus = { ...record.status, state: 'ready', updated_at: new Date().toISOString() };
  store = new Map(store).set(jobId, { ...record, status: nextStatus });
  return ok(payload);
}

export async function confirmPublished(
  jobId: string,
  storyId: string,
  editorId: string,
): Promise<MockResponse> {
  const record = store.get(jobId);
  if (!record) return fail('not_found', `Job ${jobId} not found`, 404);

  const nextStatus: JobStatus = { ...record.status, state: 'published', updated_at: new Date().toISOString() };
  store = new Map(store).set(jobId, { ...record, status: nextStatus, publishedStoryId: storyId });
  return ok({ acknowledged: true, published_by: editorId });
}
