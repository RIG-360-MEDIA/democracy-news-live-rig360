// Image cleanliness scan (server-only). Flags "graphic" thumbnails — breaking-news posters, logo
// cards, flat colour banners — so the reader hides them. Pure sharp (no OCR), calibrated on real
// data: posters have few dominant colours + high saturation; photos have many colours, muted sat.
// Reads candidates via sqlAnalytics, writes verdicts to rigwire.image_checks via sql.

import sharp from 'sharp';

import { sql, sqlAnalytics } from '@/lib/db';

async function classify(url: string): Promise<{ clean: boolean; detail: string | null }> {
  const r = await fetch(url, { headers: { 'User-Agent': 'rigwire-img/1' }, signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error('http ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  const { data } = await sharp(buf).resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = data.length / 3;
  const buckets = new Map<number, number>();
  let sat = 0;
  for (let i = 0; i < data.length; i += 3) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const k = ((R >> 6) << 4) | ((G >> 6) << 2) | (B >> 6); // 4 levels/channel → 64 buckets
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    sat += mx ? (mx - mn) / mx : 0;
  }
  const t = [...buckets.values()].sort((a, b) => b - a);
  const top1 = t[0] / px, top3 = (t[0] + (t[1] ?? 0) + (t[2] ?? 0)) / px, s = sat / px;
  // graphic if: one colour dominates (solid bg) · OR VERY flat regardless of saturation (white-bg logo /
  // banner — real photos top out ~0.60-0.72, logos hit 0.78+) · OR moderately flat AND very saturated
  // (colour poster). Thresholds raised from the first pass, which over-flagged flat real photos (~27%).
  const graphic = top1 >= 0.6 || top3 >= 0.78 || (top3 >= 0.62 && s >= 0.55);
  return { clean: !graphic, detail: graphic ? `top1=${top1.toFixed(2)} top3=${top3.toFixed(2)} sat=${s.toFixed(2)}` : null };
}

export interface ScanResult {
  candidates: number;
  scanned: number;
  flagged: number;
  errors: number;
}

/** Scan up to `limit` unchecked, surfaceable, tier-1/2 thumbnails and record clean/graphic verdicts. */
export async function scanImageBatch(limit = 40): Promise<ScanResult> {
  const rows = (await sqlAnalytics`
    SELECT DISTINCT a.thumbnail_url AS url
    FROM analytics.story_clusters_v8 sc
    JOIN analytics.story_cluster_members_v8 m ON m.story_id = sc.story_id
    JOIN articles a ON a.id = m.article_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    WHERE sc.last_seen_at > now() - interval '7 days' AND sc.redirected_to IS NULL
      AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
      -- tier-1/2 members (candidates for the swap) PLUS every cluster's representative image at ANY
      -- tier (an all-tier-3 cluster falls back to it, so it can show and must be scanned).
      AND (coalesce(a.source_tier, 9) <= 2 OR a.id = sc.representative_article_id)
      AND ic.thumbnail_url IS NULL
    LIMIT ${limit}
  `) as unknown as { url: string }[];

  let scanned = 0, flagged = 0, errors = 0, i = 0;
  async function worker(): Promise<void> {
    while (i < rows.length) {
      const { url } = rows[i++];
      let res: { clean: boolean; detail: string | null };
      try {
        res = await classify(url);
      } catch {
        errors++;
        continue;
      }
      await sql`
        INSERT INTO rigwire.image_checks (thumbnail_url, clean, detail, checked_at)
        VALUES (${url}, ${res.clean}, ${res.detail}, now())
        ON CONFLICT (thumbnail_url) DO UPDATE SET clean = EXCLUDED.clean, detail = EXCLUDED.detail, checked_at = now()`;
      scanned++;
      if (!res.clean) flagged++;
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return { candidates: rows.length, scanned, flagged, errors };
}
