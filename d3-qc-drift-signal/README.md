# Bounty D3 — QC v2: catch the uniform-drift false negative
**Track:** Data pipeline · **Access ring:** Ring 2 · **Size:** L (~8 days)

## Context
Our SLAM pipeline reconstructs scans with no ground truth available at inference time, so we
score every reconstruction with a GT-free confidence gate (`qc/confidence.py`) before it's
allowed to feed a report, an export, or a metric claim. The gate was built from a measured
failure-mode study (internally "EXP-36") of long, loopy, wide-FOV robot tours: it catches
progressive scale collapse, graph "teleports", improper-rotation decomposition degeneracy, and
starved input — five signals, each validated to discriminate on real failed runs.

It has one documented, regression-tested blind spot. **Moderate uniform long-horizon drift**
— the trajectory doesn't collapse or jump, it just steadily wanders off metric truth — leaves
every per-step statistic clean. One of the EXP-36 cells (`go2_china_office`) drifted 27.7% of
its own extent against the robot's odometry and still scores `high_confidence` today. That gap
is pinned by a test that currently *asserts the false negative*, precisely so nobody "fixes" it
by accident without noticing:

```python
def test_moderate_uniform_drift_is_a_known_false_negative(self) -> None:
    c = compute_confidence(FIXTURES / "go2_china_office_est_tum.txt")
    assert c.level is ConfidenceLevel.HIGH_CONFIDENCE
```

## The task
Design and implement a **drift-sensitive v2 signal**, added alongside the existing five in
`qc/confidence.py`, that flips this pinned case from a false negative to a correctly-flagged
`NEEDS_REVIEW` or `OUT_OF_CLASS` — with **zero regressions** across the rest of the suite.

The module docstring names one candidate direction: *windowed scale-chain consistency vs the
trajectory's own odometry-free structure* (e.g., loop-closure return-gap, or per-submap VGGT
scale-chain consistency measured internally rather than against external odometry — the whole
point of this gate is that it needs no ground truth). You're not required to use that exact
idea, but any signal you add must stay GT-free: it can only use the trajectory + optional solver
stats already available to `compute_confidence`, never an external reference trajectory.

Concretely:
1. Add a new signal function (mirroring the style of `_trajectory_metrics` / the five existing
   signals: computed in `_trajectory_metrics` or a sibling helper, thresholded in
   `compute_confidence`, contributing to `reasons` with a stable, greppable message string).
2. Document it in the module docstring in the same style as the current five (name, one-line
   description, what EXP-36 (or your own analysis) shows it discriminates).
3. Justify your thresholds from the **provided fixtures**, not tuned blind: show your working
   for why the threshold separates `go2_china_office` (should now fail/review) from the clean
   circle + `hk_village1` + healthy synthetic cases (must stay exactly as they score today).
4. Rename `test_moderate_uniform_drift_is_a_known_false_negative` to reflect the flip (e.g.
   `test_moderate_uniform_drift_is_detected`) and update its assertion + the module docstring's
   "KNOWN LIMITATION" paragraph, which currently says this failure class is undetectable.
5. Run a false-positive analysis: your new signal must not push any of the currently-healthy
   fixtures/synthetic cases (`test_clean_circle_high_confidence`, `hk_village1`'s current
   `NEEDS_REVIEW` level, etc.) into a worse bucket than they score today. Write this up (a short
   table is fine) in your PR description or a new doc.

This module is **numpy-only** — no torch, no GPU, no network. Keep it that way.

## What's in this repo
```
qc/
  confidence.py         the module under bounty — GT-free ScanConfidence scoring, 5 signals
  cli.py                shell-facing gate: `python -m qc.cli <est_tum.txt> [--stats run.json]`,
                         exits 0/1/2 on high_confidence/needs_review/out_of_class
  __init__.py           re-exports ConfidenceLevel / ScanConfidence / compute_confidence

tests/
  test_qc_confidence.py the pinned suite (18 tests) — see "Known deviation" below
  fixtures/exp36/
    go2_bigoffice_est_tum.txt      collapsed cell (scale collapse) — must stay OUT_OF_CLASS
    go2_bigoffice_stats.json       its solver stats (sign-repair rate, keep ratio)
    hk_village1_est_tum.txt        a second real negative — must stay not-HIGH_CONFIDENCE
    go2_china_office_est_tum.txt   THE fixture for this bounty — uniform drift, currently the
                                   pinned false negative

conftest.py              kit-root sys.path bootstrap so `import qc` resolves under pytest
```

**Known deviation from the source repo:** the original test file has one more test,
`test_pipeline_qc_stage_refuses_instead_of_aborting`, which drives the same refusal contract
end-to-end through the full Oreos ingest/export pipeline (`OreosPipeline`, a much larger
subsystem not included in this kit). It was removed here — see the comment left in its place in
`tests/test_qc_confidence.py`. The refusal contract itself (a degenerate trajectory file always
scores `OUT_OF_CLASS` and never crashes) is still fully covered by the other tests in
`TestDegenerateTrajectoryFiles`, which call `compute_confidence` directly.

## Acceptance criteria
- `test_moderate_uniform_drift_is_a_known_false_negative` is renamed and its assertion flipped:
  `go2_china_office_est_tum.txt` now scores `NEEDS_REVIEW` or `OUT_OF_CLASS`, not
  `HIGH_CONFIDENCE`.
- The full suite is green, including all 17 other tests, unmodified in their assertions (you may
  need to touch fixtures/values *only* if your signal's metrics dict adds new keys those tests
  don't know about — existing assertions on existing keys must not change).
- The new signal is documented in `qc/confidence.py`'s module docstring in the same style as the
  existing five (name, one-line mechanism, what it discriminates).
- Thresholds are justified against the fixtures provided (and ideally the clean synthetic cases
  in `TestSynthetic`) — not picked to make one test pass with no argued margin.
- A brief false-positive write-up: which healthy/borderline cases you checked against the new
  signal, and why none of them regress.

## Getting started
```bash
python3 -m venv .venv && source .venv/bin/activate   # or virtualenv if venv is unavailable
pip install numpy pytest
pytest -v
```
This currently passes 18/18 (confirmed on this kit as assembled — see the note above about the
one removed pipeline-integration test). Read `qc/confidence.py` top to bottom first — the module
docstring **is** the spec for the five existing signals and states the exact gap you're closing.
Then:
1. Read the pinned test and its fixture (`tests/fixtures/exp36/go2_china_office_est_tum.txt`) —
   plot it if that helps (a TUM file: `ts tx ty tz qx qy qz qw` per line).
2. Prototype your signal against all four fixture files + the synthetic cases in `TestSynthetic`
   before touching thresholds in `compute_confidence`.
3. Implement, document, rename the pinned test, and re-run the full suite.
4. Write up your FP analysis.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
