# Bounty X3 — Submap-count QC signal study
**Track:** Experiment analysis · **Access ring:** Ring 1 · **Size:** M (~4 days)

## Context
Our reconstruction pipeline ships a ground-truth-free confidence gate:
before any scale-dependent export (metric claims, robot-training data), a
handful of signals computed purely from the estimated trajectory decide
whether a run is high-confidence, needs review, or out of class. Those
signals were calibrated against a 32-run internal spike that scored public,
Apache-2.0-licensed quadruped/drone recordings against each recording's own
odometry reference, and they catch the catastrophic failure shapes that
spike found (progressive scale collapse, trajectory teleports, rotation
degeneracies) — but a documented limitation is that they miss **moderate,
uniform** long-horizon drift, which doesn't disturb any single frame's
statistics.

A follow-up experiment shipped **session duration** as an additional QC
signal after finding that reconstruction error grows near-linearly with how
long a tour runs (measured directly via nested-duration truncations of the
same recording: 60s/120s/240s/full). That same follow-up named **submap
count** as the next candidate signal, untested — plausible because submap
count should track duration closely, but possibly redundant with it, or
possibly carrying independent information (e.g. an unusually submap-dense
session for its length might mean something duration alone can't tell you).
This bounty is that test.

## The task
Using only the frozen artifacts in `data/` — **no new SLAM/reconstruction
runs** — determine whether submap count adds independent predictive power
for scan failure over session duration alone, on the 32-run scored set.

1. Read `docs/current-qc-note.md` for what the shipped gate already checks,
   why duration was added, and exactly why submap count is the open
   question (this is your only required background reading).
2. Build a per-run table from `data/table.md` + `data/exp36_runs/<cell>/`:
   session duration (derivable from `est_tum.txt`'s timestamp span, or from
   `metadata.json`'s `camera.span_s` where present), submap count
   (`run_summary.json`'s `submaps` field), and a failure label (use
   `ate_rpe.json`'s `coverage_ok`/`metric_valid`/`ate_rmse_pct_extent`, or
   derive your own threshold from `%extent` — document your choice).
3. **Don't stop at univariate correlation.** Duration and submap count are
   likely collinear (more time reconstructed → more submaps, all else
   equal) — the actual question is whether submap count explains failure
   *beyond* what duration already explains. Use `data/exp37_runs/` (the
   duration-nested-prefix series: the same recording truncated at four
   lengths) as your cleanest natural experiment for separating the two,
   alongside the cross-sectional 32-run set.
4. Propose a concrete threshold rule (submap-count-based, or a
   duration+submap-count combination) and quantify its **expected false
   positive / false negative rate** against the labeled runs.
5. If submap count turns out to add nothing beyond duration — say so
   plainly, with the evidence. A clean, well-supported null is a valid and
   useful deliverable here; an invented lift is not.

## What's in this repo
- `data/table.md` — the full 32-run scored table (ATE, %extent, %path,
  rotation error, RPE, scale/scale-CV, loop-closure count, sign repairs,
  frame counts, GPU seconds) from the internal robot-data spike.
- `data/exp36_runs/<cell>/` — per-run artifacts for every scored cell and
  ablation variant: `run_summary.json` (submap count, frame counts, loop
  closures, config), `ate_rpe.json` (full ATE/RPE scoring incl.
  `coverage_ok`/`metric_valid`/`ate_rmse_pct_extent`), `metadata.json`
  (capture duration where recorded), `est_tum.txt`/`groundtruth.txt`/
  `odom_base.txt` (trajectory files — duration is derivable from any of
  these directly, as the timestamp span), plus `analysis.json`/
  `lidar_map_comparison.json` where they exist. `run_ids.json` and
  `extension_log.txt` are provenance (ingest/run bookkeeping) — informative
  but not required for the analysis.
- `data/exp37_runs/<cell>/` — the duration follow-up's 5 cells:
  `go2_hongkong_office__pre60`/`__pre120`/`__pre240` (nested-duration
  truncations of one recording) plus `tum_fr2_desk`/`tum_fr3_long_office`
  (clean handheld anchor cells, for the embodiment-cost comparison the note
  describes). Each has `run_summary.json` + `ate_rpe.json`, same schema as
  above.
- `data/fixtures/` — 3 real trajectory files (`go2_bigoffice`,
  `go2_china_office`, `hk_village1` `est_tum.txt`, plus one `stats.json` of
  solver counters) already used as test fixtures elsewhere in the codebase —
  useful as small, known-good inputs if you want to sanity-check any parsing
  code against something already validated.
- `docs/current-qc-note.md` — distilled explanation of the shipped gate's
  five signals, why duration was added, and why submap count is the
  open question this bounty resolves.

## Acceptance criteria
- [ ] An analysis script or notebook that builds the per-run
      duration/submap-count/failure-label table from `data/` and is
      re-runnable end to end.
- [ ] Univariate correlation of submap count with failure, **and** an
      added-value analysis over duration alone (e.g. partial correlation,
      a duration-only vs. duration+submap-count comparison, or residualizing
      submap count against duration before testing it) — a bare univariate
      correlation is not sufficient on its own, since collinearity with
      duration is the whole crux of the question.
- [ ] A proposed threshold rule, stated concretely (what's measured, what
      the cutoff is, what confidence tier it maps to).
- [ ] An FP/FN table for the proposed rule against the labeled 32-run set
      (plus the exp37 cells if you incorporate them into labeling).
- [ ] An honest null reported as such if the data doesn't support adding
      submap count as an independent signal — do not manufacture a lift
      that isn't in the data.

## Getting started
1. Read `docs/current-qc-note.md` end to end.
2. Write a small loader that walks `data/exp36_runs/*/` and
   `data/exp37_runs/*/`, pulling `submaps` from `run_summary.json`,
   duration from `est_tum.txt`'s timestamp span (or `metadata.json` when
   present), and `ate_rmse_pct_extent`/`coverage_ok` from `ate_rpe.json`.
   Cross-check a couple of rows against `data/table.md` by hand.
3. Plot submap count vs. duration first — confirm/quantify the collinearity
   before trying to disentangle it.
4. Use the `exp37_runs` nested-duration series as your sharpest tool: same
   recording, same optics, four durations — any submap-count effect that
   shows up *within* that series, controlling for duration, is much more
   convincing than anything from the cross-sectional 32-run set alone.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
