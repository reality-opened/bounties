# Bounty T2 — Gaussian-Splat PLY Inspector
**Track:** Eval & tooling · **Access ring:** Ring 1 · **Size:** M (~3.5 days)

## Context
Our SLAM pipeline can export a reconstructed scene as a 3D Gaussian Splatting
(3DGS) `splat.ply` file — a specific 17-field binary vertex schema that most
3DGS viewers expect. Nothing currently checks that a splat file actually
conforms to that schema before it gets opened in a viewer or handed to a
downstream consumer. A subtly wrong file — fields in the wrong order, a bad
quaternion, a body cut short — doesn't error out cleanly; it either crashes a
viewer with an unhelpful message or silently renders garbage. This bounty
builds a standalone command-line tool that catches that whole class of
problem before the file goes anywhere.

## The task
Build a standalone **splat inspector** CLI that, given a `.ply` path:

1. **Validates** it against the schema in `docs/splat-ply-spec.md`:
   `binary_little_endian` header, exactly 17 `float` properties in the
   documented name-and-order, a data section whose byte length matches the
   declared vertex count exactly, every field finite, `f_dc_*` within the
   valid color-encoding range, and `rot_0..3` within tolerance of unit norm.
2. **Reports summary stats**: gaussian count, and distribution summaries
   (min / max / mean / a couple of percentiles) for the opacity and scale
   fields.
3. **Reports clamp-tail diagnostics**: how many gaussians (and what
   fraction) sit at or above a high percentile (e.g. p99) of that file's own
   scale distribution — see the "Scale-tail clamping" note in the spec for
   why this matters.
4. **Renders a quick preview**: any approach is fine — a matplotlib scatter
   of an axis-aligned 2D projection of the gaussian centers (optionally
   colored by the decoded RGB) is the simplest correct option. This is a
   debug aid, not a real splat renderer.
5. **Catches all 5 corruption classes** described in `fixtures/corruptions.md`
   with a specific, actionable message — no bare stack traces — and reports
   **no issues** on both files in `samples/`.

## What's in this repo
- `docs/splat-ply-spec.md` — standalone spec for the 17-field splat PLY
  schema: field order, color/opacity/scale/rotation encodings, and the
  minimal validity checklist.
- `fixtures/corruptions.md` — the 5 corruption classes your validator must
  catch, each with the mutation, why it happens in practice, and how to
  detect it. Described, not pre-generated — build your own seeded-corruption
  generator as part of your test suite.
- `samples/sample_small.ply` (500 gaussians) and `samples/sample_large.ply`
  (5000 gaussians) — clean, spec-conforming files with plausible (not
  degenerate) value distributions, for exercising the "no issues" path and
  the summary-stats / preview-render paths.
- `scripts/make_samples.py` — stdlib-only (`struct`, `random`, `math`, fixed
  seed), regenerates both sample files byte-identically. Rerun any time with
  `python3 scripts/make_samples.py`.

## Acceptance criteria
- [ ] CLI installs cleanly (`pip install .` or documented equivalent) and
      exposes clear `--help` usage.
- [ ] Runs clean ("no issues") on both `samples/*.ply` files, printing
      count, opacity/scale distribution summaries, and the clamp-tail
      diagnostic.
- [ ] Produces a preview image/plot for both samples without erroring.
- [ ] For each of the 5 corruption classes in `fixtures/corruptions.md`, a
      seeded repro file is caught with a specific, correct message (which
      field(s), what's wrong) — not a generic parse failure.
- [ ] No bare stack traces on any malformed input — every failure path is a
      handled, actionable error.
- [ ] Unit tests cover all 5 corruption classes plus the two clean samples.

## Getting started
1. Read `docs/splat-ply-spec.md` end to end — the field order and each
   encoding (color / opacity / scale / rotation) are the whole contract.
2. `python3 scripts/make_samples.py` to (re)generate `samples/*.ply` and
   confirm you get the same byte counts printed by the script's own
   verification pass.
3. Read `fixtures/corruptions.md` and write a small script that takes a
   clean sample and applies exactly one seeded mutation per class — that's
   your test fixture set.
4. Build validation first (all 5 classes failing loudly and specifically),
   then layer summary stats, the clamp-tail diagnostic, and the preview
   render on top.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
