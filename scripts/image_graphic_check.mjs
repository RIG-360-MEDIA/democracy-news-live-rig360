// Flag "graphic" thumbnails (breaking-news posters, logo cards, flat color banners) so the reader
// hides them — catches junk that the source-tier heuristic misses (tier-2 outlets post posters too).
// Pure Node + sharp (no OCR/Tesseract), so it runs locally or on the box. Writes rigwire.image_checks.
//
//   DATABASE_URL=postgresql://…@localhost:5433/rig  node scripts/image_graphic_check.mjs [limit]
//
// Heuristic (calibrated: posters sat≈0.66 top3≈0.62; real photos sat≈0.15-0.36): a thumbnail is a
// GRAPHIC when one colour covers ≥55% of pixels, OR the top-3 colours cover ≥58% AND it's very
// saturated (≥0.50). Real photographs have many colours and muted average saturation.
import postgres from 'postgres';
import sharp from 'sharp';

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set'); process.exit(1); }
const sql = postgres(DB, { ssl: false });
const LIMIT = Number(process.argv[2] || 400);
const CONCURRENCY = 8;

async function classify(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'rigwire-img/1' }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error('http ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  const { data } = await sharp(buf).resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = data.length / 3;
  const buckets = new Map();
  let sat = 0;
  for (let i = 0; i < data.length; i += 3) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const k = ((R >> 6) << 4) | ((G >> 6) << 2) | (B >> 6); // 4 levels/channel → 64 buckets
    buckets.set(k, (buckets.get(k) || 0) + 1);
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    sat += mx ? (mx - mn) / mx : 0;
  }
  const t = [...buckets.values()].sort((a, b) => b - a);
  const top1 = t[0] / px, top3 = (t[0] + (t[1] || 0) + (t[2] || 0)) / px, s = sat / px;
  const graphic = top1 >= 0.55 || (top3 >= 0.58 && s >= 0.5);
  return { clean: !graphic, detail: graphic ? `graphic top1=${top1.toFixed(2)} top3=${top3.toFixed(2)} sat=${s.toFixed(2)}` : null };
}

async function main() {
  const rows = await sql`
    SELECT DISTINCT a.thumbnail_url AS u
    FROM analytics.story_clusters_v8 sc
    JOIN analytics.story_cluster_members_v8 m ON m.story_id = sc.story_id
    JOIN articles a ON a.id = m.article_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    WHERE sc.last_seen_at > now() - interval '7 days' AND sc.redirected_to IS NULL
      AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
      AND coalesce(a.source_tier, 9) <= 2 AND ic.thumbnail_url IS NULL
    LIMIT ${LIMIT}`;
  let ok = 0, flagged = 0, err = 0, i = 0;
  async function worker() {
    while (i < rows.length) {
      const { u } = rows[i++];
      let res;
      try { res = await classify(u); } catch { err++; continue; }
      await sql`INSERT INTO rigwire.image_checks (thumbnail_url, clean, has_text, detail, checked_at)
                VALUES (${u}, ${res.clean}, null, ${res.detail}, now())
                ON CONFLICT (thumbnail_url) DO UPDATE SET clean = EXCLUDED.clean, detail = EXCLUDED.detail, checked_at = now()`;
      ok++;
      if (!res.clean) flagged++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`scanned ${ok}, flagged graphic ${flagged}, errors ${err}, of ${rows.length}`);
}

main().finally(() => sql.end());
