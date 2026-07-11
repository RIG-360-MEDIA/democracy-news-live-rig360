#!/usr/bin/env python3
"""
Thumbnail cleanliness scanner — flags article thumbnails that carry another outlet's
logo, watermark, or name so the reader (Democracy News Live) never displays them.

WHAT IT DOES
  For each not-yet-scanned thumbnail, it runs OCR (Tesseract). Any embedded text is a
  strong signal of a watermark / agency credit / publisher name burned into the image.
  It writes a verdict to rigwire.image_checks(thumbnail_url, clean, has_text, detail).
  The reader hides images where clean = FALSE (see ranking.ts / detail.ts / feed.ts).

  OCR catches text overlays ("© GETTY", "The Guardian", bylines). To also catch purely
  GRAPHICAL logos with no text, swap `classify_text()` for a vision-model call at the
  marked TODO (Claude vision, or a small logo detector) — same write path.

RUN ON THE BOX (has Python + local Postgres):
  pip install psycopg2-binary pillow pytesseract requests
  apt-get install -y tesseract-ocr
  DATABASE_URL=postgresql://rigwire_app:...@localhost:5433/rig python3 image_logo_check.py --limit 500

IMPORTANT — this is NOT a licensing fix. Removing a logo does not grant the right to use
another outlet's/agency's photo. Pair this with license-safe sourcing (Wikimedia, licensed
wire, or generated images). This scanner only prevents *misattribution*, not infringement.
"""
import argparse
import io
import os
import re
import sys

import psycopg2
import requests
from PIL import Image
import pytesseract

# Outlet / agency names that, if OCR sees them, are a near-certain "not ours" watermark.
KNOWN_MARKS = re.compile(
    r"\b(guardian|reuters|getty|associated press|\bap\b|bbc|cnn|bloomberg|afp|epa|shutterstock|"
    r"alamy|istock|nyt|new york times|washington post|sky news|al jazeera|reserved|copyright|©)\b",
    re.IGNORECASE,
)
# Any run of letters this long counts as a meaningful text overlay (byline/caption burned in).
MEANINGFUL_TEXT = re.compile(r"[A-Za-z]{4,}")


def classify_text(text: str) -> tuple[bool, str]:
    """Return (clean, detail). TODO: swap/augment with a vision model for graphical logos."""
    t = " ".join(text.split())
    if not t:
        return True, ""
    if KNOWN_MARKS.search(t):
        return False, f"known-mark: {t[:120]}"
    words = MEANINGFUL_TEXT.findall(t)
    if len(words) >= 3:  # several real words burned into a photo → treat as an overlay/credit
        return False, f"text-overlay: {t[:120]}"
    return True, ""


def scan(conn, limit: int) -> None:
    cur = conn.cursor()
    # SCAN THE SLATE, not the firehose: only thumbnails that can actually surface — tier-1/2 photos
    # of surfaceable clusters seen in the last 7 days that haven't been checked yet. Tier-3 tabloid
    # images are already skipped for display by the reader, so there's no point OCR-ing them.
    cur.execute(
        """
        SELECT DISTINCT a.thumbnail_url
        FROM analytics.story_clusters_v8 sc
        JOIN analytics.story_cluster_members_v8 mem ON mem.story_id = sc.story_id
        JOIN articles a ON a.id = mem.article_id
        LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
        WHERE sc.last_seen_at > now() - interval '7 days'
          AND sc.redirected_to IS NULL
          AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
          AND coalesce(a.source_tier, 9) <= 2
          AND ic.thumbnail_url IS NULL
        LIMIT %s
        """,
        (limit,),
    )
    urls = [r[0] for r in cur.fetchall()]
    print(f"scanning {len(urls)} thumbnails", flush=True)

    checked = 0
    for url in urls:
        clean, detail, has_text = True, "", False
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": "rigwire-image-check/1"})
            resp.raise_for_status()
            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            text = pytesseract.image_to_string(img)
            has_text = bool(MEANINGFUL_TEXT.search(text))
            clean, detail = classify_text(text)
        except Exception as e:  # unreachable image → leave for a retry, don't poison the flag
            print(f"  skip {url[:70]}: {e}", flush=True)
            continue

        cur.execute(
            """
            INSERT INTO rigwire.image_checks (thumbnail_url, clean, has_text, detail, checked_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (thumbnail_url) DO UPDATE
              SET clean = EXCLUDED.clean, has_text = EXCLUDED.has_text,
                  detail = EXCLUDED.detail, checked_at = now()
            """,
            (url, clean, has_text, detail or None),
        )
        checked += 1
        if checked % 50 == 0:
            conn.commit()
            print(f"  committed {checked}", flush=True)
    conn.commit()
    print(f"done — {checked} scanned", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=500)
    args = ap.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL not set", file=sys.stderr)
        return 1
    with psycopg2.connect(dsn) as conn:
        scan(conn, args.limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
