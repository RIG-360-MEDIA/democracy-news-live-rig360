// src/lib/editorial/merges.ts
//
// STEP 3 — review the AI's same-event merge decisions. The event-merge system logs every LLM verdict
// to analytics.merge_verdicts (story_a, story_b, cos, llm_same, llm_conf, reason); this surfaces them
// so an editor can sanity-check what the machine folded together. Lives on the BOX (point the analytics
// client there). Reversibility of the merge itself is the story_dedup map + editorial.audit.

import { sqlAnalytics } from '@/lib/db';

export interface MergeVerdict {
  storyA: string;
  storyB: string;
  headlineA: string;
  headlineB: string;
  cos: number;
  same: boolean;
  confidence: number;
  reason: string;
  at: string;
  folded: boolean; // did this pair actually get folded in story_dedup?
}

export async function recentMerges(limit = 100): Promise<MergeVerdict[]> {
  const rows = (await sqlAnalytics`
    SELECT v.story_a, v.story_b,
           coalesce(ga.headline, '—') AS ha, coalesce(gb.headline, '—') AS hb,
           v.cos, v.llm_same, v.llm_conf, coalesce(v.reason,'') AS reason, v.created_at,
           EXISTS (SELECT 1 FROM analytics.story_dedup d
                    WHERE d.story_id IN (v.story_a, v.story_b)) AS folded
    FROM analytics.merge_verdicts v
    LEFT JOIN analytics.story_generated_v8 ga ON ga.story_id = v.story_a
    LEFT JOIN analytics.story_generated_v8 gb ON gb.story_id = v.story_b
    ORDER BY v.created_at DESC
    LIMIT ${limit}`) as unknown as Array<{
      story_a: string; story_b: string; ha: string; hb: string; cos: string | number;
      llm_same: number; llm_conf: string | number; reason: string; created_at: string | Date; folded: boolean;
    }>;
  return rows.map((r) => ({
    storyA: r.story_a, storyB: r.story_b, headlineA: r.ha, headlineB: r.hb,
    cos: Number(r.cos), same: r.llm_same === 1, confidence: Number(r.llm_conf),
    reason: r.reason, at: new Date(r.created_at).toISOString(), folded: r.folded,
  }));
}
