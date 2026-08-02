# Bounty X1 — Finish the pooled depth-model stress report
**Track:** Experiment analysis · **Access ring:** 1 · **Size:** S (~1.5 days)

## Context

A stress test ("EXP-32") pitted our SLAM pipeline's temporal-coherence claim
against a video-depth baseline model across a batch of manipulation episodes
split into two task families, ET and HE. Per-episode scoring is **complete
for the ET family (25/25)** but **partial for the HE family (10/19 scored —
see "Known data gap" below)**; the pooling script that turns these per-episode
scores into the pre-registered H1/H2/H3 verdict was never run, and the report
is still full of `{{placeholder}}` tokens. The report template and
pre-registered gates are frozen — the job is to finish it faithfully against
whatever data actually exists, not to re-run anything.

## The task

Run `pool_scores.py` over the frozen per-episode summaries, fill every
`{{placeholder}}` in `DRAFT-REPORT.md` with the computed values, and write the
verdict section arguing strictly from the pre-registered gates in
`PREREG.md`. Do not re-score, re-run, or adjust any threshold.

## What's in this repo

```
exp32_videodepth_stress/
  PREREG.md                     pre-registered hypotheses/gates (H1/H2/H3), LOCKED — read first
  DRAFT-REPORT.md                report template, still full of {{...}} placeholders — fill this in
  pool_scores.py                 the pooling script — reads results/, writes results/exp32_pooled.json
  results/
    exp32_depthgem_batch_summary.json   depth-raster generation stage summary (H3 input) — 44/44 OK
    exp32_score_et_summary.json         ET-family per-episode scores, bundled as one JSON (see below)
    exp32_score_he_summary.json         HE-family per-episode scores, bundled as one JSON (see below)
    exp26_ref_et/*.json (25 files)      FROZEN reference-arm scores for the same 25 ET episodes
    exp26_ref_he/*.json (19 files)      FROZEN reference-arm scores for the same 19 HE episodes

exp21_recon_vs_baselines/
  metrics/                       stats package pool_scores.py imports (Wilcoxon/bootstrap/Hodges-Lehmann)
                                  — a sibling dir on purpose, see "Path/schema mismatch" below

NOTICE.md                        CC-BY-NC / internal-only notice — read before sharing anything
README.md                        this file
```

**Files intentionally NOT included**, and why:
- `RUNBOOK.md`, `modal_exp32_depthgem.py`, `modal_exp32_score_et.py`,
  `modal_exp32_score_he.py` — these are the Modal/GPU execution scripts that
  *generated* the frozen results. The task is analysis-only (no re-scoring),
  so they're out of scope on purpose; nothing in the pooling step needs them.

## Path/schema mismatch you need to resolve first (found during kit assembly)

`pool_scores.py`'s own docstring says it reads per-episode files from
`results/scores_et/*.json` and `results/scores_he/*.json` (one JSON file per
episode). **Those directories don't exist** — what exists instead is a single
bundled file per family:

```json
{"episodes": [...], "not_ready": [...], "results": [{...one episode...}, ...]}
```

Each element of `"results"` with `"status": "OK"` already has the *exact*
per-episode schema `pool_scores.py` expects (`episode_id`, `scores`,
`alignment`, `reference`, etc. — it's the same dict shape as the
`exp26_ref_{et,he}/<episode_id>.json` files, just not yet split into files).
Elements with `"status": "ERROR"` only carry `episode_id`/`status`/`error`.

We ran `pool_scores.py` as-is against exactly the files in this kit to
confirm this: **it executes cleanly (exit 0, no exceptions)** — dependencies
resolve fine — but because `results/scores_et/` and `results/scores_he/`
are empty/absent, it silently pools **zero** episodes into H1/H2 and prints a
verdict of `CLAIM-BOUNDED` that means nothing (n=0 everywhere, not a real
finding). H3 still works because it reads
`exp32_depthgem_batch_summary.json` directly by full path, not via a
per-episode glob.

**Before your real run**, split each summary's `"results"` entries out into
the per-episode files `pool_scores.py` actually globs for, e.g.:

```python
import json, os
for family in ("et", "he"):
    d = json.load(open(f"exp32_videodepth_stress/results/exp32_score_{family}_summary.json"))
    outdir = f"exp32_videodepth_stress/results/scores_{family}"
    os.makedirs(outdir, exist_ok=True)
    for r in d["results"]:
        with open(f"{outdir}/{r['episode_id']}.json", "w") as f:
            json.dump(r, f)
```
(`ERROR` entries are harmless to write too — `pool_scores.py`'s own cell
lookups skip any episode missing a `"scores"` key.) This is pure data
reshaping — no scores are computed, changed, or dropped by it.

## Known data gap (do not try to fix by re-running)

Cross-checking `results/exp32_score_he_summary.json`'s `"episodes"`/`"results"`
against `results/exp26_ref_he/` (the frozen 19-episode HE target set) shows
**only 10 of 19 HE episodes have a usable `"status": "OK"` score**:
- 7 were never attempted in this batch at all (not present in `"episodes"`):
  `HE__serve_bread__000..004`, `HE__water_flowers__005`, `HE__water_flowers__008`.
- 2 were attempted but failed with a transient Modal infrastructure error
  (`GRPCError ... function ... is stopped` — not a scientific failure):
  `HE__water_flowers__007`, `HE__water_flowers__009`.

The ET side is complete (25/25 target episodes scored OK; 2 extra `OK` rows
are dev episodes that `pool_scores.py`'s own `DEV` firewall already excludes
from pooling — no action needed there). The depth-raster generation stage
(`exp32_depthgem_batch_summary.json`) is complete for all 44 target episodes
(44/44 OK), so **H3 can be computed exactly as pre-registered**; H1/H2 can
only pool over 25 ET + 10 HE = **35 of 44** episodes as the data currently
stands.

**Do not re-run scoring to fill this gap** — that's out of scope for this
bounty (no re-scoring). Pool over what exists and state the reduced HE n
plainly in the report and in a "deviations" note, per the acceptance
criteria below.

## Acceptance criteria
- Every number in the finished report is traceable to `pool_scores.py` output
  (include the raw output — the printed tables and/or `results/exp32_pooled.json`
  — as an appendix file).
- The verdict follows the pre-registered gates in `PREREG.md` mechanically;
  any judgment call (including the HE data gap above) is flagged as such in a
  "deviations" note.
- No re-scoring, no threshold changes, no dropped episodes without
  documenting why (the 9 missing HE episodes above already come
  pre-documented — carry that forward, don't re-derive it from scratch).

## Getting started

Dependencies: Python 3 + `numpy` + `scipy` (that's it — no pandas). We
verified with `numpy==2.5.1`, `scipy==1.18.0` on Python 3.12; older versions
should work fine, nothing version-pinned in the script. If your machine
doesn't have them:
```bash
python3 -m pip install --target ./pylibs numpy scipy
PYTHONPATH=./pylibs python3 exp32_videodepth_stress/pool_scores.py
```
`pool_scores.py` also imports a small stats helper package
(`metrics.stats`, for Wilcoxon signed-rank / bootstrap CI / Hodges-Lehmann)
via a `sys.path` hack that expects a **sibling** directory two levels up named
`exp21_recon_vs_baselines/metrics/` — that's why this kit ships that
directory alongside `exp32_videodepth_stress/`, at the same tree level.
Keep that relative layout intact.

Once the per-episode files exist under `results/scores_et/` and
`results/scores_he/` (see "Path/schema mismatch" above), the exact
invocation, run from inside `exp32_videodepth_stress/`, is:

```bash
cd exp32_videodepth_stress
python3 pool_scores.py
```

It prints the H1/H2/H3 tables + verdict to stdout and writes
`results/exp32_pooled.json` (the full pooled data, including every row) —
that JSON is your appendix file for the acceptance criteria above.

We confirmed this exact invocation **executes without error** against this
kit's files (before the per-episode split, it runs but pools 0 episodes as
explained above; the dependency and import chain are otherwise verified
working end-to-end).

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in
  progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and
  report it — that's a bug on our side, and worth credit.
- See [NOTICE.md](NOTICE.md) — this bundle is internal-only; nothing from it
  may be published externally.
