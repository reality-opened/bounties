# SLAM CLI contract + runner responsibilities

This defines the contract between the 7-Scenes benchmark runner (the thing
this bounty builds) and the SLAM binary it drives, plus what the runner
itself is responsible for. The contract is intentionally minimal so the
runner can drive *any* conforming SLAM implementation, not just one
specific codebase.

## The CLI contract

A conforming SLAM binary is any executable invocable as:

```
<cmd> --image_folder <dir> --log_path <out.txt>
```

- `--image_folder <dir>`: a directory of per-frame color images for one
  capture sequence, in ascending-frame order by filename sort.
- `--log_path <out.txt>`: where the binary writes its estimated camera
  trajectory, in TUM format (`timestamp tx ty tz qx qy qz qw`, one pose per
  line, ascending timestamp, scalar-last quaternion) — one line per
  processed frame, in the same order the frames were read.
- Exit code `0` on success; any other exit code means the runner must treat
  that sequence as failed for this invocation (see "resumability" below) and
  must not treat a partial/missing `<out.txt>` as a valid result.

This mirrors the real flag names (`--image_folder`, `--log_path`) used by
this program's own reference SLAM CLI. One real-CLI quirk worth calling out
explicitly, so a runner built against *that* specific binary doesn't
silently produce an empty log file: its `--log_path` value is only written
if a separate `--log_results` flag is also passed — `--log_path` alone just
sets *where* the log would go, it doesn't *turn on* logging. A runner
talking to that binary specifically should pass `--log_results` alongside
`--log_path`; a runner talking to a generic conforming binary (this bounty's
own `stub/fake_slam.py` included) can assume `--log_path` alone is
sufficient, since the stub always writes when given a path. Document
whichever assumption your runner makes.

The runner should treat the SLAM command itself as pluggable — a path to an
executable/script, plus any binary-specific extra arguments the caller wants
forwarded — not hardcoded to one specific script.

## Runner responsibilities

1. **Per-sequence orchestration.** Enumerate every scene/sequence pair under
   a dataset root laid out per `docs/dataset-pointers.md`, and invoke the
   SLAM command once per sequence: `--image_folder` pointed at that
   sequence's color-image directory, `--log_path` pointed at a per-sequence
   output file the runner controls (e.g.
   `<output_dir>/<scene>/<sequence>/est.txt`).

2. **ATE scoring.** For each sequence, compute Absolute Trajectory Error
   between the SLAM output and that sequence's ground-truth trajectory using
   the public [`evo`](https://github.com/MichaelGrupp/evo) toolkit's
   `evo_ape` in TUM mode, with **Sim(3) alignment** (align *and* scale —
   the `-as` flag in `evo`'s CLI) rather than rigid-only alignment, since a
   monocular/scale-free reconstruction's trajectory isn't expected to be in
   the same absolute scale as the ground truth. Capture at minimum the RMSE
   from `evo`'s output (see the sibling eval-log spec for the exact schema
   an aggregator expects it in).

3. **Resumability.** Before invoking the SLAM command for a given sequence,
   check whether that sequence's expected output artifacts already exist and
   look valid — a non-empty TUM log that parses, and a previously recorded
   score. If so, **skip re-running that sequence** and reuse the recorded
   result. Provide an explicit override (e.g. a `--force` flag) to re-run
   anyway. This matters because a full 7-Scenes sweep is a lot of
   sequences, and a crash or interruption partway through a long run
   shouldn't mean starting over from sequence 1.

4. **Parameterized paths — no hardcoded directories.** Every path the runner
   needs — the dataset root, the output/log directory, the path to the SLAM
   command itself, and any pass-through SLAM arguments — must be a runner
   CLI argument (or read from a config file the caller supplies). This is a
   direct fix for an anti-pattern already present in this program's existing
   TUM evaluation harness, whose shell script hardcodes a specific user's
   home-directory path as a shell variable at the top of the file and
   requires hand-editing that line to run anywhere else. The 7-Scenes
   runner must not repeat that mistake — nothing about *where the data
   lives* or *where output goes* should be baked into the script.

5. **Log format compatible with the existing TUM harness.** Append one CSV
   row per `(run, sequence)` using the same three columns as the existing
   harness's aggregated results log: header `Run,Dataset,RMSE`, then rows
   `<run>,<scene>/<sequence-id>,<rmse>` (or another single-string sequence
   identifier of your choice, documented) — so the exact same downstream
   aggregation/reporting tooling that already consumes that column layout
   can consume this runner's output too, without a format-specific branch.

## What's explicitly out of scope

- Implementing or bundling an actual SLAM algorithm — the runner drives an
  external binary; `stub/fake_slam.py` is provided purely so the runner can
  be built and tested without a real SLAM system on hand.
- Re-implementing ATE/RPE math — always shell out to `evo`, don't
  hand-roll trajectory-error formulas.
- Downloading the real 7-Scenes archive — see
  `docs/dataset-pointers.md` for where it lives publicly; this kit ships
  small fake sequences under `fixtures/` in the *same directory shape* so
  the runner can be developed and tested without the real (multi-GB)
  download.
