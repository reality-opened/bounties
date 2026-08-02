# Bounty T3 — Eval Trend Report Generator
**Track:** Eval & tooling · **Access ring:** Ring 1 · **Size:** M (~4.5 days)

## Context
Our TUM-benchmark evaluation harness produces a flat CSV-style log per run
(`Run,Dataset,RMSE`), and repeated harness invocations accumulate more rows
into the same file. Right now, understanding whether a change made accuracy
better or worse means opening that file by hand — there's no report that
shows per-sequence numbers, how a metric trends run over run, or a
trajectory plotted against ground truth. This bounty builds that report as a
static, shareable HTML page generated from a results directory with one
command.

## The task
Build a CLI that takes a results directory and produces a single static HTML
report:

1. **Per-sequence RMSE table** — every dataset scored, across every run
   present in the directory.
2. **Run-over-run trend chart** — how each sequence's (and the overall
   average's) RMSE moves across runs, so a regression is visible at a
   glance.
3. **Trajectory-vs-GT plot support** — given a matching pair of TUM pose
   files (ground truth + estimate) for a sequence, render the two
   trajectories together.
4. **Correct behavior for both 1 run and N runs** — a directory with a
   single run is a valid, common case (not a degenerate one): it should
   render as a per-sequence table with no trend line, not as an error.

## What's in this repo
- `docs/log-schema.md` — standalone spec for the aggregated results-log
  format (`Run,Dataset,RMSE`, the `Average` row convention, how a missing
  sequence shows up), a description of `evo`'s optional richer
  `--save_results` archive as an optional companion format, the TUM pose
  file format used for the trajectory plot, and the report generator's
  overall input contract.
- `samples/results/tum_results_w16.txt` — a synthetic 5-run x 5-sequence
  results log: 3 clean runs, one run (#4) with a sequence missing entirely
  (simulating a failed SLAM invocation that never produced a scoreable
  result), and one degraded run (#5, ~4-5x the healthy RMSE — a regression
  case). Every line after the header is `Run,Dataset,RMSE`-shaped; the file
  opens with the required synthetic-data marker comment.
- `samples/pose_pairs/gt.txt` + `est.txt` — a tiny (24-pose) matching
  TUM ground-truth/estimate pair, for exercising the trajectory-plot
  feature.
- `scripts/make_sample_logs.py` — stdlib-only, fixed-seed, regenerates all
  of the above byte-identically. Rerun any time with
  `python3 scripts/make_sample_logs.py`.

## Acceptance criteria
- [ ] One command turns `samples/` into a static HTML report.
- [ ] Per-sequence RMSE table renders correctly for all 5 runs in the
      sample log.
- [ ] Run #4's missing sequence renders as a visible, explicit gap (e.g.
      "no data") — not a crash, not a silent zero, not dropped from the
      table without a trace.
- [ ] Run #5's regression is visually apparent in the trend chart (not just
      present in the underlying numbers).
- [ ] The trajectory-vs-GT plot renders correctly from
      `samples/pose_pairs/{gt,est}.txt`.
- [ ] Report renders correctly given only a single run's worth of data too
      (test by pointing the tool at a copy of the samples with runs 2-5
      removed) — no run-over-run chart is expected, but nothing errors and
      no fabricated trend line appears.
- [ ] No fabricated-looking defaults anywhere: any state with nothing to
      show says so explicitly ("no data"), rather than rendering a zero,
      an empty chart with no explanation, or a placeholder that could be
      mistaken for a real number.

## Getting started
1. Read `docs/log-schema.md` end to end — the `Run,Dataset,RMSE` format,
   the `Average`-row and missing-sequence conventions, and the TUM pose
   format are the whole input contract.
2. `python3 scripts/make_sample_logs.py` to (re)generate everything under
   `samples/` and confirm you get the same row counts the script's own
   verification pass prints.
3. Parse `samples/results/tum_results_w16.txt` first and get the
   per-sequence table right, including run #4's gap, before touching
   charting.
4. Layer the run-over-run trend chart, then the trajectory-vs-GT plot from
   `samples/pose_pairs/`, on top.
5. Test the single-run path explicitly — it's easy to accidentally special-
   case "N runs" code so that N=1 breaks.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
