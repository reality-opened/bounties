# Bounty X2 — Multi-pair metric-anchor estimator study
**Track:** Experiment analysis · **Access ring:** Ring 1 · **Size:** M (~5 days)

## Context
Our SLAM pipeline turns a reconstructed scene into real-world metres using a
single **metric anchor**: an operator clicks two pixels with a known
real-world distance between them, and the resulting one scalar scale factor
is applied to the *entire* multi-submap map. An internal characterization
study measured how accurate that single-pair anchor really is across 8
scenes in 5 capture classes (clean handheld TUM sequences, sparse handheld
ARKit captures, short robot passes, and a multi-room home tour), each scored
against independent ground truth. The headline: the click-and-lift math
itself is precise (sub-1.5% jitter floor everywhere), but the *realized*
scale error the operator actually gets is class-conditional — near the floor
on clean single-pass captures, but **5–22% off on sparser/longer capture
classes** — and the gap traces to a **local depth-model bias at the specific
pixels clicked**, not to click imprecision and not primarily to scale drift
accumulating across submaps (that hypothesis was tested and refuted: far
submaps were *not* reliably worse than the anchor submap).

The study's own recommendation, never built or evaluated, is **multi-pair
averaging across different depths/views** — since the bias is local to
*where* you click, averaging over several different locations should dilute
any one location's bias, which re-clicking the same spot more carefully
cannot do. This bounty is that follow-up: turn the recommendation into an
estimator and measure whether it actually works, on the frozen data already
collected.

## The task
Design and evaluate a **multi-pair averaging estimator** as a drop-in
alternative to the current single-pair anchor, using only the frozen
per-scene artifacts in `data/` — **no re-scoring of raw scenes, no new SLAM
runs**. Concretely:

1. Read `docs/method-note.md` for how the current estimator works and what
   was measured (this is your only required background reading).
2. Using the per-scene fields in `data/exp30_results.json` (click-noise
   floor, local-depth-bias magnitude, submap counts, scene class, `E_anchor`/
   `E_far`/drift), build a **simulation** of what an N-pair averaging
   estimator would measure instead of the shipped single-pair one. You will
   need to make explicit, documented modeling choices about how per-pair
   error is distributed and how correlated different pairs' local biases are
   likely to be (the raw per-draw click residuals were not persisted — only
   the aggregated floor/bias statistics survive — so your simulation must be
   built from those aggregates, and you should say plainly what you assumed
   and why).
3. Evaluate the estimator against the frozen 8-class table: report bias
   **vs. the single-pair baseline, per scene class**, with **bootstrap error
   bars**.
4. Deliver a **recommendation**: how many pairs should the product require,
   and what selection rule (e.g., forced spread across submaps/views vs.
   operator's free choice) — justified by where the simulated gains
   saturate or stop being worth the extra operator clicks.

## What's in this repo
- `data/exp30_results.json` — the frozen, already-scored per-scene results:
  8 scenes × 5 capture classes, each with `n_submaps`, `E_anchor_pct`,
  `E_far_pct`, `drift_pct`, `click_noise_floor_pct`, `local_depth_bias_pct`,
  plus a `summary` block with the two tested hypotheses' pass/fail bars.
  This is the only data file that exists for this study — there is no
  separate per-click-pair log; per-scene aggregates are the finest
  granularity available (see `docs/method-note.md` §3 for why that's still
  enough to simulate from).
- `docs/method-note.md` — distilled explanation of the anchor mechanism, the
  measured finding, and the named remedy this bounty implements.

## Acceptance criteria
- [ ] Estimator implemented in plain **numpy** (no new heavyweight deps).
- [ ] Per-class bias table comparing the multi-pair estimator against the
      single-pair baseline (the existing `E_anchor_pct` column), for at least
      a few candidate pair-counts (e.g. N=1 baseline, N=3, N=5, N=8+).
- [ ] Error bars via **bootstrap** (resampling over simulated pair draws
      and/or over scenes within a class — state which, and why).
- [ ] A short written **recommendation memo**: how many pairs, what
      selection rule, and an honest statement of where the estimator does
      *not* help (e.g. if a class's bias is so large or so correlated across
      the scene that averaging can't rescue it — report that plainly rather
      than overstating the win).
- [ ] No re-scoring of raw scenes or new SLAM/reconstruction runs — this is
      an analysis exercise on the frozen artifacts only.

## Getting started
1. Read `docs/method-note.md` end to end — it has the full mechanism, the
   class table, and the exact fields you'll use from the JSON.
2. Load `data/exp30_results.json` and look at `per_scene[]` — get familiar
   with the fields before designing your simulation.
3. Start simple: a baseline model where each pair's error is drawn from a
   distribution parameterized by that scene's measured `click_noise_floor_pct`
   and `local_depth_bias_pct`, then average N independent draws and see how
   the resulting error shrinks (or doesn't) per class.
4. Iterate on how correlated you assume different pairs' local depth biases
   to be — this assumption should be the centerpiece of your write-up, since
   it's the crux of whether multi-pair averaging can work at all here.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
