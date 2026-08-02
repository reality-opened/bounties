# Current QC note — what the shipped gate checks, and what's next

This note explains, in distilled form, what our reconstruction-quality gate
already does and why session duration was added as a signal, so you can
start the bounty without needing to read the gate's source. **You should not
need to open or copy the gate's implementation for this bounty** — a
from-scratch threshold-and-analysis exercise on the data in `data/` is the
whole point, and a from-scratch reimplementation of the gate itself is a
different piece of work entirely.

## Why a ground-truth-free gate exists at all

An internal robot-data spike scored 32 reconstruction runs (public,
Apache-2.0-licensed quadruped/drone recordings, not our own capture data)
against each run's own onboard-odometry reference. It found a real failure
class: long, loopy, wide-field-of-view tours where the *local* geometry
stays sound frame-to-frame, but the *global* trajectory drifts badly in
scale and orientation over the course of the tour — every one of those runs
"succeeded" in the sense of producing an output, with nothing in the
pipeline itself flagging that the output was bad. `data/table.md` is the
full 32-run table from that spike; `data/exp36_runs/<cell>/` holds each
run's per-cell artifacts (estimated trajectory, ground-truth/odometry
reference where available, run stats, ATE/RPE scoring).

Because there is usually no ground truth available at inference time in
production, the fix had to be a gate that scores confidence **without** any
reference trajectory — using only signals derivable from the reconstruction
itself.

## The five signals the shipped gate checks today

All five are computed from the estimated trajectory (plus a couple of
optional solver-reported counters) and were each chosen because they
separately discriminated the spike's measured failures from its clean runs:

1. **Trend** — the ratio of typical per-frame motion late in the trajectory
   vs. early in it. Progressive scale collapse (the map quietly shrinking)
   drives this far below 1.
2. **CV (coefficient of variation)** of per-frame motion steps — chaotic,
   inconsistent step sizes inflate this even when there's no overall trend.
3. **Speed-jump rate** — the fraction of steps that spike far above the
   local rolling-median step size; catches trajectory "teleports" from bad
   loop-closure or graph-junction events.
4. **Sign-repair rate** — how often the reconstruction's per-frame camera
   pose comes out with an improper rotation (a solver-internal degeneracy)
   before any correction is applied. Near-zero on healthy runs, elevated on
   the spike's worst cell.
5. **Keep ratio** — fraction of input frames actually kept/used by the
   reconstruction; catches starved input (dark, motionless, or otherwise
   unusable footage).

Each signal has a **review** threshold and a stricter **fail** threshold,
calibrated directly against the spike's 32 measured runs — chosen to err
toward flagging uncertain cases for human review rather than confidently
waving through something wrong. A run that trips no signal is high
confidence; tripping any review-level threshold demotes it to needs-review;
tripping a fail-level threshold on trend, CV, or speed-jump takes it out of
class entirely (scale-dependent exports get refused). **A documented, known
limitation:** these five signals catch *catastrophic* failure shapes
(collapse, teleports, decomposition degeneracy) but not **moderate, uniform**
long-horizon drift — one of the spike's own cells drifted badly (~28% of
scene extent vs. its odometry reference) yet reads as clean on all five
per-step signals, because uniform drift doesn't disturb any single frame's
statistics.

## The signal added after the spike: session duration

A follow-up experiment isolated *why* the spike's failures were so much
worse than our handheld-capture evals: it re-ran the identical pipeline
config on both clean handheld sequences (near the accuracy floor, as
expected) and on **nested-duration prefixes of the same long robot
recording** — the same footage, truncated at 60s, 120s, 240s, and its full
~557s length. Error grew **near-linearly with duration** (roughly a 5×
growth from the 60s prefix to the full recording), while a matched-duration
comparison against a handheld sequence showed the robot embodiment itself
costs roughly another 8× on top, independent of duration. Both effects are
real and separately quantified; **duration is the one of the two that is
directly actionable as a pre-flight signal** (you know a session's duration
before you know how "robot-like" its optics/motion are), so **session
duration shipped as a QC signal**: long sessions get flagged needs-review
until the risk is measured directly rather than assumed.

The same follow-up named **submap count** as the next candidate signal —
untested at the time — reasoning that submap count should track duration
closely (more time reconstructed → more submaps chunked) but might carry
*additional* information beyond duration alone (e.g. a session that
generates unusually many submaps for its length might indicate something
different — more loop closures, more scene complexity, more disparity-gate
churn — than a session that is merely long).

## What this bounty tests

Whether submap count is worth adding as a sixth signal (or as a
duration-signal refinement) given what the 32-run spike + the duration
follow-up's nested-prefix data actually show, or whether it's redundant with
duration and adds nothing — an honest null is a valid, useful answer here.
`data/exp36_runs/<cell>/run_summary.json` carries each run's `submaps` count
(and `frames_kept`/`frames_total`); `data/exp37_runs/<cell>/run_summary.json`
carries the same field for the duration-nested-prefix series, which is the
single cleanest natural experiment available for separating "more submaps
because the session is longer" from "more submaps independent of length."
