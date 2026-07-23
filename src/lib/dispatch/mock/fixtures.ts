// Draftsmith mock fixtures — used by the dispatch client when BOX_STUDIO_URL
// is unset/'mock', so Door B UI can be built and E2E-tested before the box API
// exists. Shapes validate against ../types.ts (the contract).

import type {
  DraftBundle,
  Flag,
  ImageCandidate,
  JobStatus,
  EvidenceRef,
  JobState,
} from '../types';

const NOW = '2026-07-21T09:00:00.000Z';

// --- evidence (8 items across all three trust tiers) -------------------------

const EVIDENCE: EvidenceRef[] = [
  { source_id: 'f1', source_type: 'story_fact', trust_tier: 1, outlet: 'Reuters, AP', title: null,
    url: null, snippet: 'Parliament passed the amended election law on 5 July 2026.', published_at: '2026-07-05T00:00:00Z' },
  { source_id: 'c1', source_type: 'corpus_article', trust_tier: 1, outlet: 'Le Monde',
    title: 'Tbilisi weighs new electoral rules', url: 'https://example.org/lemonde/1',
    snippet: 'The bill lowers the threshold for parliamentary seats and changes commission appointments.', published_at: '2026-07-06T00:00:00Z' },
  { source_id: 'w1', source_type: 'web', trust_tier: 1, outlet: 'apnews.com',
    title: 'Fourth night of protests in Tbilisi', url: 'https://example.org/ap/1',
    snippet: 'Demonstrators gathered outside parliament for a fourth consecutive night.', published_at: '2026-07-19T00:00:00Z' },
  { source_id: 'y1', source_type: 'youtube_clip', trust_tier: 1, outlet: 'Johnny Harris',
    title: 'What is happening in Georgia', url: 'https://youtube.com/watch?v=abc&t=862',
    snippet: 'At 14:22 — "The opposition says the commission changes hand the ruling party control."', published_at: '2026-07-18T00:00:00Z' },
  { source_id: 't1', source_type: 'twitter', trust_tier: 2, outlet: '@OfficialGovGe (verified)',
    title: null, url: 'https://x.com/OfficialGovGe/status/1', snippet: 'Government statement defending the reform as aligning with EU norms.', published_at: '2026-07-18T00:00:00Z' },
  { source_id: 'k1', source_type: 'wikipedia', trust_tier: 1, outlet: 'Wikipedia',
    title: 'Georgia (country)', url: 'https://en.wikipedia.org/wiki/Georgia_(country)',
    snippet: 'Georgia is a country in the Caucasus region of Eurasia.', published_at: null },
  { source_id: 'r1', source_type: 'reddit', trust_tier: 3, outlet: 'r/worldnews',
    title: null, url: 'https://reddit.com/r/worldnews/1', snippet: 'Thread with eyewitness accounts of crowd size (unverified).', published_at: '2026-07-19T00:00:00Z' },
  { source_id: 's1', source_type: 'tiktok', trust_tier: 3, outlet: '@creator',
    title: null, url: 'https://tiktok.com/@creator/video/1', snippet: 'Clip claiming police used water cannon (uncorroborated).', published_at: '2026-07-19T00:00:00Z' },
];

// --- flags (1 amber unsupported, 1 red contradicted) -------------------------

const FLAGS: Flag[] = [
  { id: 'flag-amber-1', beat_index: 2, span: 'tens of thousands of protesters', severity: 'amber',
    reason: 'Crowd size appears only in an unverified Reddit thread (tier 3); no tier-1/2 source gives a figure.',
    source_ids: ['r1'], status: 'open' },
  { id: 'flag-red-1', beat_index: 3, span: 'police fired on the crowd', severity: 'red',
    reason: 'No cited source states this; the TikTok clip alleges water cannon only. Contradicts w1.',
    source_ids: ['s1', 'w1'], status: 'open' },
];

// --- images (2 corpus, 2 wikimedia, 2 web-flagged) ---------------------------

const IMAGES: ImageCandidate[] = [
  { id: 'img1', slot: 1, origin: 'corpus', url: 'https://example.org/img/corpus1.jpg', thumb_url: null,
    license: null, attribution: 'Le Monde', needs_license_review: false, selected: false },
  { id: 'img2', slot: 2, origin: 'corpus', url: 'https://example.org/img/corpus2.jpg', thumb_url: null,
    license: null, attribution: 'AP', needs_license_review: false, selected: false },
  { id: 'img3', slot: 3, origin: 'wikimedia', url: 'https://example.org/img/commons1.jpg', thumb_url: null,
    license: 'CC BY-SA 4.0', attribution: 'A. Photographer / Wikimedia Commons', needs_license_review: false, selected: false },
  { id: 'img4', slot: 4, origin: 'wikimedia', url: 'https://example.org/img/commons2.jpg', thumb_url: null,
    license: 'Public domain', attribution: 'Wikimedia Commons', needs_license_review: false, selected: false },
  { id: 'img5', slot: 5, origin: 'web', url: 'https://example.org/img/web1.jpg', thumb_url: null,
    license: 'unknown', attribution: 'source page', needs_license_review: true, selected: false },
  { id: 'img6', slot: 6, origin: 'web', url: 'https://example.org/img/web2.jpg', thumb_url: null,
    license: 'unknown', attribution: 'source page', needs_license_review: true, selected: false },
];

// --- the needs_review draft --------------------------------------------------

const NEEDS_REVIEW: DraftBundle = {
  job_id: 'job-needs-review',
  state: 'ready',
  dials: { creativity: 6, moxy: 3, length_target: 1200, spot_check: true },
  draft: {
    headline: "Georgia's parliament passes disputed election law as protests enter a fourth night",
    dek: 'The reform changes how the electoral commission is appointed — and the opposition says that is the whole point.',
    beats: [
      { subhead: 'A vote, then a crowd', confidence: 'green', source_ids: ['f1', 'c1'],
        text: 'On 5 July, parliament passed an amended election law that lowers the seat threshold and rewrites how the electoral commission is appointed.' },
      { subhead: 'What the reform actually changes', confidence: 'green', source_ids: ['c1', 'y1'],
        text: 'The commission changes are the flashpoint: the opposition argues they hand the ruling party effective control of who counts the vote.' },
      { subhead: 'On the street', confidence: 'amber', source_ids: ['w1', 'r1'],
        text: 'Demonstrators returned to parliament for a fourth night; tens of thousands of protesters filled the square, according to accounts online.' },
      { subhead: 'Contested scenes', confidence: 'red', source_ids: ['s1'],
        text: 'As the night wore on, police fired on the crowd, footage circulating on social media appeared to show.' },
    ],
    key_facts: [
      { fact: 'Election law amended 5 July 2026.', source_ids: ['f1'] },
      { fact: 'Fourth consecutive night of protests.', source_ids: ['w1'] },
    ],
    pull_quote: { text: 'The commission changes hand the ruling party control.', speaker: 'opposition (via YouTube explainer)', source_id: 'y1' },
    unsourced_gaps: ['No official crowd-size figure available from a tier-1/2 source.'],
  },
  flags: FLAGS,
  evidence: EVIDENCE,
  images: IMAGES,
};

// --- one status row per job state --------------------------------------------

function status(job_id: string, state: JobState, phase_detail: string | null, headline: string | null): JobStatus {
  return { job_id, state, phase_detail, headline, created_by: 'you@example.com', created_at: NOW, updated_at: NOW };
}

export const MOCK_JOB_STATUSES: Record<string, JobStatus> = {
  'job-queued': status('job-queued', 'queued', 'waiting for a worker', null),
  'job-gathering': status('job-gathering', 'gathering', 'searching 8 sources…', null),
  'job-drafting': status('job-drafting', 'drafting', 'writing (~1200 words)…', null),
  'job-verifying': status('job-verifying', 'verifying', 'fact-checking each beat…', "Georgia's parliament passes disputed election law"),
  'job-needs-review': status('job-needs-review', 'ready', '2 flags to resolve', NEEDS_REVIEW.draft.headline),
  'job-failed': status('job-failed', 'failed', 'gather returned too few sources', null),
  'job-published': status('job-published', 'published', 'live', NEEDS_REVIEW.draft.headline),
};

export const MOCK_DRAFT_BUNDLES: Record<string, DraftBundle> = {
  'job-needs-review': NEEDS_REVIEW,
};

export function mockListJobs(): JobStatus[] {
  return Object.values(MOCK_JOB_STATUSES);
}

export function mockGetJob(jobId: string): DraftBundle | null {
  return MOCK_DRAFT_BUNDLES[jobId] ?? null;
}
