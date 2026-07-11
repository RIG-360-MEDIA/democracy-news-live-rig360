# Worldwide content-gen — first sample run

Model (prose): `openai/gpt-oss-120b`  ·  Verifier/Guard-C: `openai/gpt-oss-120b`

Verdict = faithfulness of the ARTICLE against its own fact-ledger (did generation stay inside its inputs).


## 1. SpaceX targets US$1.75tril valuation in all-primary IPO next week
- **Status:** PUBLISHABLE | HELD (Guard C: multi-event — needs _v8 split)
- **Guard C:** SEVERAL — dominant: SpaceX's record-breaking IPO valued at roughly $1.75‑$2 trillion
- **Attempts:** [{'strategy': 'A1', 'verdict': 'fail', 'words': 443, 'n_units': 19, 'n_fail': 2}, {'strategy': 'A2', 'verdict': 'pass', 'words': 621, 'n_units': 8, 'n_fail': 0}]
- **Won with:** Hybrid A (try 2) · 621 words
- **Headline:** SpaceX’s record‑breaking IPO raises $75 billion, values firm at about $1.75 trillion
- **Deck:** The Texas‑based rocket and AI company began trading on Nasdaq on June 12 after selling roughly 555 million shares at $135 each.

## 2. Ebola tensions rise as treatment centre torched in DR Congo’s Ituri
- **Status:** PUBLISHABLE | HELD (Guard C: multi-event — needs _v8 split)
- **Guard C:** SEVERAL — dominant: Ebola outbreak in the Democratic Republic of Congo, highlighted by the torching of a treatment centre in Ituri
- **Attempts:** [{'strategy': 'A1', 'verdict': 'pass', 'words': 526, 'n_units': 20, 'n_fail': 0}]
- **Won with:** Hybrid A (try 1) · 526 words
- **Headline:** Ebola outbreak in DRC’s Ituri province intensifies as cases surge
- **Deck:** WHO and Africa CDC report over 500 confirmed infections and rising deaths, prompting cross‑border health measures and international aid.

## 3. ben stokes dropped from england team joe root back as test captain 23634570
- **Status:** PUBLISHABLE | HELD (Guard C: multi-event — needs _v8 split)
- **Guard C:** SEVERAL — dominant: Ben Stokes dropped from England Test squad, Joe Root appointed interim captain for the second Test against New Zealand
- **Attempts:** [{'strategy': 'A1', 'verdict': 'pass', 'words': 297, 'n_units': 7, 'n_fail': 0}]
- **Won with:** Hybrid A (try 1) · 297 words
- **Headline:** ECB names Joe Root interim captain as Stokes ruled out of New Zealand Test
- **Deck:** The England & Wales Cricket Board confirmed Ben Stokes and Gus Atkinson are unavailable for the second Test, appointing Joe Root as interim captain.

## 4. Judge blocks series of Trump policies halting immigration processing
- **Status:** ERROR: UnifiedPool exhausted after 15 attempts: Error code: 429 - {'error': {'message': 'Rate limit reached for model `llama-3.
- **Guard C:** ERROR — dominant: 
- **Attempts:** []

## 5. Pentagon chief says U.S. ready to restart strikes on Iran if no deal
- **Status:** PUBLISHABLE
- **Guard C:** ONE — dominant: US-Iran war and ceasefire negotiations
- **Attempts:** [{'strategy': 'A1', 'verdict': 'pass', 'words': 656, 'n_units': 13, 'n_fail': 0}]
- **Won with:** Hybrid A (try 1) · 656 words
- **Headline:** U.S. and Iran negotiate 60‑day cease‑fire extension amid frozen‑asset dispute
- **Deck:** Talks focus on a 14‑point memorandum, release of Iranian funds and reopening the Strait of Hormuz as hostilities pause.