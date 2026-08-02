# Bounty T5 — Synthetic Artifact Fixture Generator
**Track:** Eval & tooling · **Access ring:** Ring 1 · **Size:** S (~2.5 days)

## Context
Our reconstruction pipeline emits four on-disk artifact formats per run: a
TUM pose trajectory, one per-frame point-cloud/mask NPZ per frame, a merged
colored point-cloud PLY, and a 3D Gaussian Splat PLY. Every eval, regression
test, and downstream consumer (viewers, exporters, training-data pipelines)
needs small, schema-exact synthetic examples of all four — hand-authoring
them is slow and easy to get subtly wrong. This bounty builds one generator
that emits a coherent synthetic scene in all four formats at once,
deterministically.

## The task
Build a generator library + CLI that, given a frame count and a point count
(plus a `--seed`), emits one synthetic scene as:

1. a TUM pose `.txt` file,
2. one per-frame NPZ per frame (`pointcloud` + `mask` keys),
3. one merged colored point-cloud `.ply`,
4. one 3DGS splat `.ply` (17-field binary layout),

all schema-exact per `docs/schemas.md`, and all describing the *same* scene
(consistent frame/point counts across formats — see "Cross-format
consistency" at the end of that doc). The CLI must be fully deterministic:
the same `--seed` and other args must produce byte-identical files across
runs.

## What's in this repo
- `docs/schemas.md` — the standalone spec for all four formats, precise
  enough to implement from cold: line/byte grammar, field order, dtypes,
  units, and (for the splat format) the exact SH-DC / logit / log-scale /
  quaternion encodings.
- `checkers/` — one script per format: `check_tum.py`, `check_npz.py`,
  `check_ply.py`, `check_splat.py`. Each takes a single file path, validates
  it against `docs/schemas.md`, prints every violation it finds, and exits
  `0` (pass) or `1` (fail). **These are the acceptance oracles for this
  bounty** — a generated file that doesn't pass its checker means the bounty
  isn't done yet, regardless of how it looks.

Checkers were authored and then smoke-tested in the environment used to
build this kit: one hand-fabricated valid file and one hand-fabricated
broken file per format were run through the matching checker, and each
produced the expected exit code (0 for valid, 1 for broken, with a specific
violation message). `check_npz.py`, `check_ply.py`, and `check_splat.py`
depend on `numpy` (the NPZ format itself is a numpy archive, and numpy is
used to vectorize the PLY/splat binary parsing); `check_tum.py` is
stdlib-only. `pip install numpy` before running any of the three.

## Acceptance criteria
- [ ] A single CLI invocation (e.g. `generate --frames N --points M --seed S
      --out <dir>`) produces all four artifact types for one synthetic scene.
- [ ] Every generated file passes its corresponding `checkers/check_*.py`
      with exit code 0.
- [ ] The same `--seed` and other args, run twice, produce byte-identical
      files (verify with e.g. `md5sum`/`sha256sum` across two runs).
- [ ] A different `--seed` produces different content that still passes the
      checkers.
- [ ] Frame count and point count are mutually consistent across formats per
      the "Cross-format consistency" section of `docs/schemas.md` (TUM line
      count == NPZ file count == frame count; merged-PLY vertex count == sum
      of per-frame valid-point counts; splat vertex count == merged-PLY
      vertex count).

## Getting started
1. Read `docs/schemas.md` end to end before writing any code — it's the
   whole spec, not a summary.
2. Hand-craft one tiny valid file per format (a handful of points/frames is
   enough) and run the matching checker against it to get a feel for exactly
   what's enforced, before building the generator itself.
3. Build the four writers one at a time — TUM first (simplest), splat PLY
   last (most involved: SH-DC color, inverse-sigmoid opacity, log-scale,
   quaternion convention). Run the matching checker after each writer.
4. Wire the CLI once all four writers independently pass their checkers on
   hand-built or generator-produced examples; add the determinism
   (`--seed`) and cross-format consistency checks last.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
