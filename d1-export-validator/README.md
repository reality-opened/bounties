# Bounty D1 — Robot-training export validator

**Track:** Data pipeline · **Access ring:** 1 · **Size:** L (~12 days)

## Context

Our SLAM pipeline turns a scan into two coupled artifacts: a **camera-trajectory dataset**
(RGB video + 6-DoF pose *state* + ego-motion *action*, convertible to GR00T-LeRobot v2 for
fine-tuning) and a **grounding sidecar** (scene graph, per-object 3D grounding, temporally-
localized language annotations, all evidence-cited back to a keyframe). The full format —
directory layout, every JSON/parquet schema, and the correctness traps that make this
non-trivial to get right (frame/pose alignment, evidence-ref resolution, action math, video/
row sync) — is written up in `docs/dataset-export.md`.

Today, "is this export correct?" is answered by `reference/inspect_export.py`: a hand-rolled
script with 19 `PASS`/`FAIL` print statements, added incrementally as bugs were found. It
works, but it isn't schema-complete, isn't versioned, has no test suite of its own, and every
new invariant is another manual `checks.append(...)` line. This is the highest-priority item
on the data-pipeline board — every downstream consumer (GR00T fine-tuning, the Isaac exporter
in Bounty D2, any future trainer) depends on this format being right, and right now nothing
proves it beyond "the script didn't print FAIL."

## The task

Design and build a **schema-complete, versioned validator package** for the OpenReality
export format (+ its GR00T-LeRobot v2 transcode) that supersedes `reference/inspect_export.py`.
Your design — pydantic models, jsonschema, or a hybrid — but it needs to:

1. **Cover every invariant documented in `docs/dataset-export.md`.** Read §4 (the format spec:
   directory layout, every file's schema), §7 (the correctness traps: the `index_map`
   resolution rule, the `frame_ids`/`poses` length assertion, the action-math convention, the
   frame↔video alignment), and §9 (the acceptance checklist) closely — those sections are the
   actual spec. §11 is the as-built map (useful context on what shipped and where it deviates
   from the original design). The 19 checks in `reference/inspect_export.py` are a *floor*, not
   a ceiling — go back to the doc, not just the old script, to find what's missing (e.g. it
   never checks `up_to_scale`/`gravity_aligned`/`metric` on the GR00T side, never validates
   `annotations.jsonl` channel values, never checks evidence `(submap_id, frame_idx)` shapes).
2. **Emit both a human-readable report and a JSON report.** The JSON report is what a CI job
   or a future dashboard consumes; the human-readable one is what a person pastes into a PR.
3. **Version the validator against the spec's `SCHEMA_VERSION`** (`openreality-export/0.1`,
   see `docs/dataset-export.md` §4.2 / `vendor/server/export/schema.py`) — it should refuse to
   silently validate a tree stamped with a schema version it doesn't know, rather than passing
   it by accident.
4. **Ship a corruption harness**: a tool that takes a pristine export tree and seeds **at least
   10 distinct, realistic violations** into copies of it (e.g. desync `mp4` frame count vs.
   parquet rows, put an `objects.jsonl` evidence `global_frame_index` out of `[0,N)`, flip
   `up_to_scale`, truncate `observation.state` to 6 values, put a NaN in `action`, an
   annotation window with `frame_start > frame_end`, a `modality.json` index range that doesn't
   match the feature width, a `tasks.jsonl` index referenced by no valid task, an unsorted/
   duplicated `frame_index`, an object `world_center` outside the cloud AABB, ...) and asserts
   your validator catches **every one** of them (and doesn't false-positive on the pristine
   tree).

## What's in this repo

- `docs/dataset-export.md` — the full format spec (source of truth for the invariants).
- `reference/inspect_export.py` — the existing 19-check ad-hoc script you're superseding.
  Read it for the invariants it already covers and the exact assertions it makes (e.g. `state
  width == 7`) — some of that phrasing is worth keeping, but the whole thing should end up
  redundant once your package exists.
- `scripts/make_local_export_fixture.py` — generates a **real** OpenReality + GR00T-LeRobot v2
  tree from a tiny synthetic scan, by running the actual production export code (no GPU, no
  SLAM, no network). This is how you get more fixture trees to test against; see `vendor/`.
- `vendor/` — read-only, vendored production code the fixture generator needs to run. **Not
  the deliverable and not the spec** — see `vendor/README.md`.
- `fixtures/local_fixture/` — a pristine tree already generated for you (`export/fixture/` +
  `groot/fixture/`), so you can start on the validator immediately without running the
  generator yourself. Regenerate it any time with `scripts/make_local_export_fixture.py`.
- `requirements.txt` — deps for the docs/scripts in this kit (not for your validator's own
  dependencies, which are your call).

## Acceptance criteria

- Every invariant documented in `docs/dataset-export.md` (§4, §7, §9 — OpenReality tree *and*
  GR00T-LeRobot v2 transcode) is covered by the validator, with a test proving it's checked.
- The corruption harness seeds **≥10 distinct violations**; the validator catches all of them,
  each with a specific, attributable failure (not just "something's wrong").
- The validator passes clean on the pristine fixture tree in `fixtures/local_fixture/` (zero
  false positives).
- Runs CPU-only — no GPU, no torch, no network calls.
- The validator is versioned against `SCHEMA_VERSION` (`openreality-export/0.1`) and refuses
  (or clearly flags) a tree stamped with a schema version it wasn't built against.

## Getting started

```bash
pip install -r requirements.txt
python reference/inspect_export.py --export fixtures/local_fixture/export/fixture \
                                     --groot  fixtures/local_fixture/groot/fixture
# regenerate / make more fixture trees:
python scripts/make_local_export_fixture.py --out ./local_fixture --to-lerobot --keyframes 20
```

Read `docs/dataset-export.md` top to bottom before writing code — §7 in particular documents
several traps that are easy to get wrong (and easy to under-validate) if you only skim it.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
