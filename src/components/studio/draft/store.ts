// Door B review store (zustand). Holds the draft bundle the review surface
// edits, plus the hover/selection UI state the rail + publish bar read.
//
// Two flows are OPTIMISTIC (apply → reconcile → rollback + toast on error):
//   - beat text edits (debounced autosave via PATCH)
//   - per-flag resolution (POST, one flag at a time)
// Publish is deliberately NOT optimistic — it awaits the box's verdict.
//
// Every update returns a NEW object (immutability rule) — no in-place mutation.

import { create } from 'zustand';

import { publishRequest, resolveFlagRequest, saveBeatsRequest } from './api';

import type {
  Dials,
  Draft,
  DraftBundle,
  EvidenceRef,
  Flag,
  ImageCandidate,
} from '@/lib/dispatch/types';

/** Toast callback (from useToast().show) — passed in so the store can toast on
 * rollback without depending on React hooks. */
export type Notify = (message: string, tone?: 'info' | 'error') => void;

interface Selection {
  hoveredBeat: number | null;
  chosenImageId: string | null;
}

interface ReviewState {
  jobId: string;
  draft: Draft | null;
  flags: readonly Flag[];
  evidence: readonly EvidenceRef[];
  images: readonly ImageCandidate[];
  dials: Dials | null;
  selection: Selection;
  saving: boolean;
  publishing: boolean;

  hydrate: (bundle: DraftBundle) => void;
  hoverBeat: (index: number | null) => void;
  editBeatText: (index: number, text: string) => void;
  commitBeats: (notify: Notify) => Promise<void>;
  resolveFlag: (
    flagId: string,
    action: 'dismiss' | 'fixed',
    note: string | undefined,
    notify: Notify,
  ) => Promise<void>;
  chooseImage: (imageId: string) => void;
  publish: (notify: Notify) => Promise<string | null>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  jobId: '',
  draft: null,
  flags: [],
  evidence: [],
  images: [],
  dials: null,
  selection: { hoveredBeat: null, chosenImageId: null },
  saving: false,
  publishing: false,

  hydrate: (bundle) =>
    set({
      jobId: bundle.job_id,
      draft: bundle.draft,
      flags: bundle.flags,
      evidence: bundle.evidence,
      images: bundle.images,
      dials: bundle.dials,
      selection: {
        hoveredBeat: null,
        chosenImageId: bundle.images.find((i) => i.selected)?.id ?? null,
      },
    }),

  hoverBeat: (index) => set((s) => ({ selection: { ...s.selection, hoveredBeat: index } })),

  editBeatText: (index, text) =>
    set((s) => {
      if (!s.draft) return {};
      const beats = s.draft.beats.map((b, i) => (i === index ? { ...b, text } : b));
      return { draft: { ...s.draft, beats } };
    }),

  commitBeats: async (notify) => {
    const { jobId, draft } = get();
    if (!draft) return;
    const snapshot = draft; // rollback target — what we are about to send
    set({ saving: true });
    try {
      await saveBeatsRequest(jobId, snapshot.beats);
      // The box echoes what we sent; keep the optimistic draft so keystrokes that
      // landed mid-flight are not clobbered. Reconcile == clear the saving flag.
      set({ saving: false });
    } catch (e: unknown) {
      set({ draft: snapshot, saving: false }); // rollback
      notify(e instanceof Error ? e.message : 'Autosave failed', 'error');
    }
  },

  resolveFlag: async (flagId, action, note, notify) => {
    const target = get().flags.find((f) => f.id === flagId);
    if (!target || target.status !== 'open') return;

    const optimistic: Flag = {
      ...target,
      status: action === 'dismiss' ? 'dismissed' : 'fixed',
      resolution_note: note ?? null,
    };
    set((s) => ({ flags: s.flags.map((f) => (f.id === flagId ? optimistic : f)) })); // apply

    try {
      const confirmed = await resolveFlagRequest(get().jobId, flagId, action, note);
      set((s) => ({ flags: s.flags.map((f) => (f.id === flagId ? confirmed : f)) })); // reconcile
    } catch (e: unknown) {
      set((s) => ({ flags: s.flags.map((f) => (f.id === flagId ? target : f)) })); // rollback
      notify(e instanceof Error ? e.message : 'Could not resolve the flag', 'error');
    }
  },

  chooseImage: (imageId) => set((s) => ({ selection: { ...s.selection, chosenImageId: imageId } })),

  publish: async (notify) => {
    set({ publishing: true });
    try {
      const { id } = await publishRequest(get().jobId);
      notify('Published — live', 'info');
      return id;
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Publish failed', 'error');
      return null;
    } finally {
      set({ publishing: false });
    }
  },
}));
