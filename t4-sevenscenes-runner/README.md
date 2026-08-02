# Bounty T4 — 7-Scenes Benchmark Runner
**Track:** Eval & tooling · **Access ring:** Ring 1 · **Size:** M (~5 days)

## Context
Our existing evaluation tooling only drives one fixed public benchmark (TUM
RGB-D) via a shell script that hardcodes a specific user's home directory —
it can't be pointed at a different dataset or a different machine without
hand-editing the script. 7-Scenes is a second widely-used public
tracking/relocalization benchmark we don't have any runner for at all. This
bounty builds a proper, parameterized runner for it: something that drives
any conforming SLAM binary over the public 7-Scenes layout, scores each
sequence, and can resume a long sweep after an interruption — without
repeating the hardcoded-path mistake.

## The task
Build a **7-Scenes benchmark runner** that, given a dataset root, an output
directory, and a SLAM command to drive:

1. Walks the 7-Scenes directory layout (`docs/dataset-pointers.md`) and
   invokes the SLAM command once per sequence, following the CLI contract
   in `docs/cli-contract.md` (`--image_folder <dir> --log_path <out.txt>`).
2. Converts each sequence's per-frame `pose.txt` ground truth into a single
   TUM-format file, then scores the SLAM output against it via `evo_ape`
   with Sim(3) alignment (`-as`).
3. Skips any sequence whose valid output + score already exist, unless the
   caller explicitly asks to re-run (resumability).
4. Takes every path — dataset root, output directory, SLAM command path —
   as a parameter (CLI flag or config file), never hardcoded.
5. Appends results in the same `Run,Dataset,RMSE` row format our existing
   TUM harness already produces, so the same aggregation/reporting tooling
   can consume either.

## What's in this repo
- `docs/cli-contract.md` — the SLAM-binary CLI contract the runner drives,
  and a full breakdown of the runner's five responsibilities (orchestration,
  ATE scoring, resumability, parameterization, log format), including the
  specific hardcoded-path anti-pattern this runner needs to avoid repeating.
- `docs/dataset-pointers.md` — the public 7-Scenes dataset's scene/sequence/
  frame layout, per-frame file naming, and where its ground truth lives
  (and in what shape — a conversion step is required, it isn't already a
  single TUM file).
- `stub/fake_slam.py` — a working, deterministic stub SLAM binary honoring
  the CLI contract: lists the images in `--image_folder`, writes one
  TUM-format pose per image to `--log_path`, with a smooth trajectory shape
  derived from a hash of the folder name (so different sequences get
  different but always-reproducible fake trajectories). Use this to build
  and test the runner without any real SLAM system.
- `fixtures/scene-fake/` — 2 tiny fake sequences (`seq-01`, 6 frames;
  `seq-02`, 8 frames) in the real dataset's directory shape, each with
  empty placeholder color images and an already-aggregated synthetic
  `gt.txt` ground-truth trajectory (a convenience — real 7-Scenes ships
  per-frame `pose.txt` instead, see `docs/dataset-pointers.md`), plus
  `TrainSplit.txt`/`TestSplit.txt`.
- `scripts/make_fixture_sequences.py` — stdlib-only, deterministic,
  regenerates everything under `fixtures/`. Rerun any time with
  `python3 scripts/make_fixture_sequences.py`.

## Acceptance criteria
- [ ] End-to-end run against `stub/fake_slam.py` over both fake sequences in
      `fixtures/scene-fake/` produces a per-sequence TUM output and an
      RMSE score for each.
- [ ] Running again with no changes **skips** both sequences (resumability)
      and only re-runs when explicitly forced.
- [ ] No path is hardcoded anywhere in the runner — dataset root, output
      directory, and SLAM command are all parameters.
- [ ] Output log uses the same `Run,Dataset,RMSE` column layout as the
      existing TUM harness's aggregated log (compatible with its
      downstream aggregator without a format-specific branch).
- [ ] Runner works against a real conforming SLAM binary too, not just the
      stub — i.e. nothing in its design assumes `fake_slam.py`-specific
      behavior beyond the documented CLI contract.

## Getting started
1. Read `docs/cli-contract.md` and `docs/dataset-pointers.md` end to end.
2. `python3 scripts/make_fixture_sequences.py` to (re)generate
   `fixtures/scene-fake/` and confirm the same frame/pose counts the
   script's own verification pass prints.
3. Smoke-test the stub directly:
   `python3 stub/fake_slam.py --image_folder fixtures/scene-fake/seq-01 --log_path /tmp/est.txt`
   and confirm `/tmp/est.txt` is a well-formed TUM file.
4. Build per-sequence orchestration against the stub first (skip `evo`
   entirely at first — just get the invocation loop and log-writing right),
   then add ATE scoring, then resumability.
5. Once it works against `fixtures/scene-fake/`, verify the same runner
   works against a real 7-Scenes download (or another conforming SLAM
   binary) without code changes — only different CLI arguments.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
