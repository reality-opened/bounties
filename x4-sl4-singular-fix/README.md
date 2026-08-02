# Bounty X4 — SL(4) singular-matrix crash: repro + fix
**Track: Experiment analysis · Access ring: 1 · Size: M (~5 days)**

## Context

Our SLAM pose graph represents every camera pose as a 4x4 homography that has
to live in SL(4) — the group of 4x4 real matrices with determinant exactly 1.
Homographies arrive from upstream estimation with an arbitrary positive scale
baked in, so before one can be inserted as a graph node it gets rescaled to
unit determinant by a small numpy function, `normalize_to_sl4`.

On one public 8112-frame robot recording, that rescale step crashes: SL(4)
graph insertion fails with a native "SL4 Constructor: input matrix singular"
error, and it reproduces in **every configuration we've tried** (default,
and two alternate loop-closure/window settings) — not an occasional flake,
a deterministic failure on this recording. The proximate cause is a
homography whose determinant has collapsed to (numerically) zero, or is
negative, reaching code that isn't safe against that.

The function you'll be working with already fixed two *silent* failure modes
from an earlier version — a negative determinant used to produce an all-NaN
matrix with no exception at all, and an exact-equality singularity check let
values like `1e-300` sail through into a ~1e75 blow-up. Turning silent
garbage into a clean, documented `ValueError` was real progress. It is not
the end state: a `ValueError` raised out of a call made thousands of times
per recording is still a crash from the batch job's point of view. Nothing
today stops one bad homography from taking an entire multi-thousand-frame
run down. That's the gap this bounty closes.

## The task

1. **Build a minimal repro.** Using `tests/test_crash.py` and
   `fixtures/synthetic_degenerate.py` as your starting point, confirm for
   yourself exactly which inputs currently crash `normalize_to_sl4` (raise)
   versus which ones silently sail through a determinant-only check while
   being numerically unsafe. Both are in scope (see "What's in this repo").
2. **Implement a numerically safe normalization.** Options include (not
   exhaustive, and not mutually exclusive):
   - a condition-number gate with an explicit, documented fallback when the
     gate trips (e.g. return a regularized/clamped matrix instead of raising);
   - a guarded decomposition that detects near-degeneracy before it can
     amplify into garbage;
   - an SVD-based construction that clamps small singular values to a floor
     before reassembling and rescaling to unit determinant.

   **It's your call which approach — but argue it** in your PR description or
   a short note in this README: what does your fallback return, when does it
   trigger, and why is that the right thing for a SLAM pose graph to receive
   instead of a crash.
3. **Keep the healthy path byte-for-byte unchanged.** All 20 cases in
   `tests/test_regression.py` must stay green, within `1e-9` relative
   tolerance, exactly as they are today. Don't change `normalize_to_sl4`'s
   signature or its behavior on well-conditioned input — only add a path for
   the degenerate case.
4. **Make `tests/test_crash.py` pass**, and remove its `xfail` marker once it
   does (it's `strict=True` — an unexpected pass fails the suite, on
   purpose, so you don't forget this step).
5. **Document the fallback where a future maintainer will actually read it**:
   the function's docstring, plus whatever runtime signal you use (a
   `warnings.warn`, a log line, whatever you argue for in step 2) so a caller
   integrating this into the real graph-insertion path can tell a fallback
   happened.

Negative-determinant input is **out of scope** for the fallback: no real
rescale can turn a negative determinant into +1 (any real scale multiplies
the determinant by a positive `s**4`), so that stays a permanent raise. See
`tests/test_regression.py::test_negative_determinant_raises_rather_than_returning_nan`.

## What's in this repo

- **`src/sl4_normalize.py`** — `normalize_to_sl4`, extracted verbatim from
  `vggt_slam/slam_utils.py` in the `core` SLAM library. This is the only
  function in scope; it has no dependency beyond numpy. (The pose-graph code
  that calls it — GTSAM factor graphs, submap bookkeeping — is deliberately
  **not** included; you're fixing the math primitive, not the graph plumbing
  around it.)
- **`tests/test_regression.py`** — the project's existing 20-case regression
  suite for this function, adapted here with only the import changed (the
  original stubbed `torch`/`torchvision` because it imported from
  `vggt_slam.slam_utils`, which pulls those in for unrelated helpers; this
  kit's extracted module doesn't, so that stubbing is gone). These cases are
  bit-identical to the ones running against the function in the real repo
  today.
- **`tests/test_crash.py`** — the acceptance test for this bounty. It's
  `xfail(strict=True)` against the current code (see the module's own
  docstring for exactly what fails and why) and is what "done" looks like
  once you make it pass.
- **`fixtures/synthetic_degenerate.py`** — degenerate 4x4 matrices standing
  in for the china_office crash class: exact rank-deficient matrices, a
  determinant sweep from 1e-6 down to 1e-16, and a **condition-number** sweep
  from 1e6 to 1e16 held at determinant ≈ 1 (a case a pure determinant check
  can't see at all). Generated deterministically (fixed seeds); rerun
  `python3 fixtures/synthetic_degenerate.py` to print each case's determinant
  and condition number.

  **PENDING: real crash matrices — requires a pipeline replay by us.** We
  looked for the actual homographies that crashed SL(4) graph insertion on
  the china_office recording in that experiment's raw artifacts (run
  summaries, trajectories, frame dumps) and they aren't there — the crash
  message and its batch-run IDs were logged, but the offending matrix itself
  was never dumped to disk. The synthetic fixtures above are a considered
  stand-in built from the two failure shapes the crash report actually
  names (singular / rank-deficient, and — the thing a naive fix would miss —
  numerically ill-conditioned without a small determinant), not a replay of
  the real failure. If we get a real repro dump before you're deep into
  this, we'll drop it in as `fixtures/crash_matrices.npz` and point you at it.

## Acceptance criteria

- [ ] All 20 cases in `tests/test_regression.py` pass, unmodified, within
      `1e-9` relative tolerance.
- [ ] `tests/test_crash.py` passes with its `xfail` marker removed (all 16
      synthetic degenerate cases: 4 rank-deficient, 6 determinant-sweep, 6
      condition-number-sweep).
- [ ] `normalize_to_sl4`'s signature and its behavior on well-conditioned
      input are unchanged — no regressions, no new required arguments.
- [ ] The fallback path is documented in the function's docstring, and
      observable at runtime (not just a code comment).
- [ ] A short written argument (PR description or README addendum) for why
      the chosen approach — condition-number gate, guarded decomposition,
      SVD clamp, or otherwise — is the right one.

## Getting started

```bash
python3 -m venv .venv && source .venv/bin/activate     # or virtualenv, if venv's ensurepip is unavailable
pip install numpy scipy pytest

pytest tests/test_regression.py -v      # should be 20 passed
pytest tests/test_crash.py -v           # should be 16 xfailed today
python3 fixtures/synthetic_degenerate.py   # eyeball det/condition number per case
```

Read `src/sl4_normalize.py` end to end first — both function docstrings (the
module's and `normalize_to_sl4`'s own) explain exactly what's already guarded
and why. Then read `tests/test_crash.py`'s docstring, which spells out the
precise contract your fallback needs to satisfy (no exception, a `Warning`
of some kind, a finite result, determinant ≈ 1 within `1e-6`). Iterate against
`fixtures/synthetic_degenerate.py`'s three generators independently — the
rank-deficient cases and the condition-number cases are different hazards
and a fix for one won't automatically cover the other.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
