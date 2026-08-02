# Bounty T1 — TUM Pose-File Validator + Diff CLI
**Track:** Eval & tooling · **Access ring:** Ring 1 · **Size:** S (~2 days)

## Context
Our SLAM pipeline writes camera trajectories in the public TUM RGB-D pose-file
convention at several points — per-run exports, evaluation baselines,
regression comparisons across code changes. There's currently no standalone
tool to sanity-check a pose file before it goes into an eval, or to diff two
trajectories and get a quick ATE/RPE readout without hand-rolling a script
each time. This bounty builds that tool as a small, pip-installable CLI.

## The task
Build a pip-installable CLI with two subcommands:

1. **`validate <file>`** — checks a TUM trajectory file against the grammar
   and rules in `docs/tum-format-spec.md`: well-formed 8-column lines,
   monotonic (non-decreasing) timestamps, unit quaternions (`‖q‖ = 1`,
   tolerance `1e-6`), all values finite, a sane minimum pose count. Every
   violation must be reported with its 1-indexed line number.
2. **`diff <file_a> <file_b>`** — produces an ATE/RPE summary comparing two
   trajectories by driving the public [`evo`](https://github.com/MichaelGrupp/evo)
   toolkit (`evo_ape`, `evo_rpe`) rather than reimplementing the metrics.
   Output must match `evo` run directly on the same file pair, within a
   documented numerical tolerance.

## What's in this repo
- `docs/tum-format-spec.md` — standalone TUM pose-file format spec, written
  to be implemented from cold (grammar, field types, the 5 validation rules,
  what's deliberately out of scope).
- `fixtures/` — 4 tiny hand-authored trajectory files: `clean_20.txt` (valid),
  `nonmonotonic.txt`, `nonunit_quat.txt`, `nan_values.txt` (one corruption
  class each, documented in each file's header comment).
- `scripts/make_fixtures.py` — stdlib-only (no numpy, no randomness), builds
  all 4 fixtures deterministically from the same clean base trajectory. Rerun
  it any time with `python3 scripts/make_fixtures.py`; output is
  byte-identical every run.

## Acceptance criteria
- [ ] CLI installs via `pip install .` and exposes console-script entry
      point(s) (`validate`/`diff`, or a single `tumtool` with subcommands —
      contributor's choice, document it in the CLI's own `--help`).
- [ ] `validate` accepts `fixtures/clean_20.txt` cleanly and rejects each of
      the other three fixtures, naming the specific corrupted line number(s)
      and which rule was violated.
- [ ] Unit tests cover every corruption class in `docs/tum-format-spec.md`
      (malformed line, non-monotonic timestamp, non-unit quaternion,
      non-finite value, too-few-poses) — add fixtures beyond the 4 shipped
      here as needed.
- [ ] `diff`'s ATE/RPE numbers match `evo_ape`/`evo_rpe` invoked directly on
      the same file pair, within a tolerance you choose and justify in the
      README or test comments.
- [ ] No bare stack traces on malformed input anywhere — every error path
      produces a specific, actionable message.

## Getting started
1. Read `docs/tum-format-spec.md` end to end.
2. `python3 scripts/make_fixtures.py` to (re)generate `fixtures/*.txt` and
   confirm you get the same files already checked in.
3. `pip install evo` locally so you have a reference implementation to diff
   your `diff` subcommand against.
4. Scaffold the CLI (stdlib `argparse` or a small dependency like `click` are
   both fine), implement `validate` first against the 4 fixtures, then wire
   `diff` on top of `evo`.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
