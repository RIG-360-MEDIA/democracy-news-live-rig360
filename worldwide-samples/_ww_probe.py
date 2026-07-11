"""_ww_probe.py — check which models ACTUALLY have daily headroom (don't assume)."""
import asyncio
import sys
import time

sys.path.insert(0, "/app")
from backend.nlp.groq_client import call_groq  # noqa: E402

MODELS = [
    "openai/gpt-oss-120b",      # the locked content-gen model (headroom workhorse)
    "openai/gpt-oss-20b",       # smaller gpt-oss
    "qwen/qwen3-32b",           # pool default (suspected exhausted)
    "llama-3.3-70b-versatile",  # low quota (suspected exhausted)
    "llama-3.1-8b-instant",
]


async def probe(m: str) -> str:
    t0 = time.time()
    try:
        r = await asyncio.wait_for(
            call_groq(system="You reply with exactly one word.",
                      user="Reply with the word: ready",
                      task_type="generation", model=m, max_tokens_override=300),
            timeout=60,
        )
        dt = time.time() - t0
        ok = (r or "").strip().replace("\n", " ")
        tag = "OK  " if ok else "EMPTY"
        return f"{tag} {m:28s} {dt:5.1f}s -> {ok[:60]!r}"
    except Exception as e:
        dt = time.time() - t0
        return f"FAIL {m:28s} {dt:5.1f}s -> {type(e).__name__}: {str(e)[:120]}"


async def main() -> None:
    for m in MODELS:
        print(await probe(m), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
