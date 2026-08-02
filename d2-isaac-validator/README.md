# Bounty D2 — Isaac USD export validator

**Track:** Data pipeline · **Access ring:** 1 · **Size:** M (~6 days)

## Context

Alongside the robot-training (LeRobot/GR00T) export, we also turn a finished scan into a
**metric, gravity-aligned, Z-up USD scene** that loads directly in NVIDIA Isaac Sim / Isaac
Lab: a mesh (or points-only fallback) with a physics collider, plus an animated camera
following the scan trajectory. The two hard problems — gravity alignment (the SLAM world
frame is *not* gravity-aligned; we estimate it from the dominant floor plane) and metric scale
(the SLAM world frame is *not* metric; scale comes from a user-supplied factor or a reference
object) — plus the USD-specific conventions (Z-up, meters-per-unit, the CV↔USD camera flip)
are all written up in `docs/isaac-export.md`.

Today, "is this USD export correct?" is answered by `reference/inspect_isaac.py`: a 16-check
ad-hoc script, the sibling of D1's `inspect_export.py` and with the same shape of problem — it
works, but it's not a real package, has no test suite, and every new invariant is another
manual `check(...)` call. This bounty is a smaller, sibling scope to D1: same idea (supersede
the ad-hoc inspector with a real validator package + a corruption harness), applied to the USD
side instead of the LeRobot side.

## The task

Design and build a **validator package** for the Isaac USD export
(`scene.usd`/`trajectory.usd`/`manifest.json`) that supersedes `reference/inspect_isaac.py`.
Read `docs/isaac-export.md` §2 (what it writes), §5 (the code map — useful for understanding
*why* each invariant holds), and §6 (the verification-status table) as the spec. At minimum,
validate:

- **Stage metadata**: `upAxis == Z`, `metersPerUnit == 1.0`, default prim is `/World` — on
  *both* `scene.usd` and `trajectory.usd` (USD's unauthored defaults are Y-up / centimeters;
  getting this wrong is silent and easy).
- **Mesh / point counts vs. the manifest**: `/World/Environment`'s vertex/face count (or
  `/World/Cloud`'s point count, for the points-only fallback) matches `manifest.json`'s
  `geometry.num_vertices`/`num_faces`/`num_points`; the collision API is present iff
  `geometry.has_collision` says so.
- **Camera time-samples vs. keyframes**: `/World/Camera`'s animated transform has exactly
  `manifest.json`'s `num_keyframes` time samples — a mismatch means a keyframe got dropped or
  duplicated while authoring the trajectory.
- **Metric + gravity flags**: `manifest.json`'s `alignment.metric` / `alignment.gravity_aligned`
  are internally consistent (e.g. `metric: true` implies `scale > 0` and
  `meters_per_unit == 1.0`; a non-metric export says so honestly in `notes`), the `transform`
  is a valid 4×4 affine (bottom row `[0,0,0,1]`), and — go beyond what
  `reference/inspect_isaac.py` checks — that reopening the USD and reading the camera's world
  position/forward vector back out is consistent with `manifest.json`'s `alignment.transform`
  applied to the pre-alignment SLAM pose (the current script never actually reads a camera
  sample's transform and checks it against the manifest, only the *count* of samples).
- Same corruption-harness idea as D1, scaled to this format's size: seed **≥10 distinct
  violations** (wrong `upAxis`, `metersPerUnit != 1.0`, mesh vertex count mismatching the
  manifest, missing `CollisionAPI` when the manifest claims `has_collision: true`, a
  `trajectory.usd` with the wrong number of time samples, a non-4×4 or non-affine transform,
  `metric: true` with `scale <= 0`, a camera sample whose transform doesn't match the
  manifest's alignment, ...) into copies of a fixture tree and prove your validator catches
  every one.

## What's in this repo

- `docs/isaac-export.md` — the full Isaac/USD export spec (source of truth for the invariants).
- `reference/inspect_isaac.py` — the existing 16-check ad-hoc script you're superseding.
- `scripts/make_isaac_fixture.py` — generates a **real** Isaac USD tree (mesh + collider +
  animated camera + manifest) from a tiny synthetic scan, by running the actual production
  export code (no GPU, no SLAM, no network — see `vendor/`).
- `vendor/` — read-only, vendored production code the fixture generator needs to run. **Not
  the deliverable and not the spec** — see `vendor/README.md`.
- `fixtures/local_isaac_fixture/` — a pristine tree already generated for you
  (`fixture/isaac/{scene.usd,trajectory.usd,manifest.json}`), full mesh + collider (not the
  points-only fallback). Regenerate it any time with `scripts/make_isaac_fixture.py`.
- `requirements.txt` — deps for the docs/scripts in this kit (not for your validator's own
  dependencies, which are your call).

## Acceptance criteria

- Every invariant in the task list above is covered, with a test proving it's checked.
- The corruption harness seeds **≥10 distinct violations**; the validator catches all of them
  with a specific, attributable failure.
- The validator passes clean on the pristine fixture tree in `fixtures/local_isaac_fixture/`
  (zero false positives).
- Runs with `usd-core` only — no GPU. `open3d` is not required to *validate* an export (only
  the fixture *generator* needs it, and only for the mesh path — see `vendor/README.md`).

## Getting started

```bash
pip install -r requirements.txt
python reference/inspect_isaac.py --isaac fixtures/local_isaac_fixture/fixture/isaac
# regenerate / make more fixture trees (needs usd-core; open3d optional for the mesh path):
python scripts/make_isaac_fixture.py --out ./local_isaac_fixture --scale 0.5
python scripts/make_isaac_fixture.py --out ./local_isaac_fixture_pts --no-mesh   # points-only variant
```

Read `docs/isaac-export.md` §1–§2 before writing code — the gravity/scale alignment and the
camera-convention flip are the two places a subtly wrong export still "looks fine" in a
generic USD viewer.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
