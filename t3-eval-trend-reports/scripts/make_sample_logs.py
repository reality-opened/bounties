#!/usr/bin/env python3
"""Generate clearly-synthetic sample eval logs + a TUM pose pair.

Stdlib-only (random, math), fixed seed -> deterministic, byte-identical
output on every run. See docs/log-schema.md for the format this follows.

Usage:
    python3 scripts/make_sample_logs.py

Writes:
    samples/results/tum_results_w16.txt   (5 runs x 5 sequences; run 4 is
                                           missing a sequence, run 5 is a
                                           degraded/regression run)
    samples/pose_pairs/gt.txt             (tiny TUM ground-truth trajectory)
    samples/pose_pairs/est.txt            (matching TUM estimate, small
                                           deterministic drift from gt.txt)

Every file starts with the required
"SYNTHETIC SAMPLE DATA — not real eval results" marker comment.
"""
import math
import os
import random

MARKER = "# SYNTHETIC SAMPLE DATA — not real eval results"

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES_DIR = os.path.join(os.path.dirname(HERE), "samples")
RESULTS_DIR = os.path.join(SAMPLES_DIR, "results")
POSE_PAIRS_DIR = os.path.join(SAMPLES_DIR, "pose_pairs")

# Five public-benchmark sequence names (same identifiers our real TUM harness
# scores against), used here purely as plausible dataset labels.
SEQUENCES = [
    "rgbd_dataset_freiburg1_360",
    "rgbd_dataset_freiburg1_desk",
    "rgbd_dataset_freiburg1_desk2",
    "rgbd_dataset_freiburg1_floor",
    "rgbd_dataset_freiburg1_plant",
]

# A plausible "typical difficulty" RMSE (meters) per sequence at a healthy
# operating point.
BASE_RMSE = {
    "rgbd_dataset_freiburg1_360": 0.028,
    "rgbd_dataset_freiburg1_desk": 0.016,
    "rgbd_dataset_freiburg1_desk2": 0.021,
    "rgbd_dataset_freiburg1_floor": 0.033,
    "rgbd_dataset_freiburg1_plant": 0.019,
}

MISSING_SEQUENCE_RUN = 4
MISSING_SEQUENCE = "rgbd_dataset_freiburg1_floor"
DEGRADED_RUN = 5
DEGRADED_FACTOR = 4.5


def jittered(rng, base, spread=0.08):
    return base * (1.0 + rng.uniform(-spread, spread))


def build_rows(rng):
    rows = []  # list of (run, dataset, rmse)
    for run in range(1, 6):
        run_rmses = []
        for seq in SEQUENCES:
            if run == MISSING_SEQUENCE_RUN and seq == MISSING_SEQUENCE:
                continue  # simulates a SLAM invocation that failed to
                # produce a scoreable result for this sequence in this run
            base = BASE_RMSE[seq]
            if run == DEGRADED_RUN:
                base = base * DEGRADED_FACTOR
            rmse = jittered(rng, base)
            rows.append((run, seq, rmse))
            run_rmses.append(rmse)
        avg = sum(run_rmses) / len(run_rmses)
        rows.append((run, "Average", avg))
    return rows


def write_results_log(path, rows):
    with open(path, "w") as f:
        f.write(MARKER + "\n")
        f.write("Run,Dataset,RMSE\n")
        for run, dataset, rmse in rows:
            f.write(f"{run},{dataset},{rmse:.4f}\n")


def make_pose_pair(path_gt, path_est, n=24, seed=0):
    rng = random.Random(seed)
    radius = 1.2
    freq = 0.12
    with open(path_gt, "w") as gt_f, open(path_est, "w") as est_f:
        for path, f in ((path_gt, gt_f), (path_est, est_f)):
            f.write(MARKER + "\n")
        for i in range(n):
            t = float(i)
            theta = freq * i
            gx = radius * math.cos(theta)
            gy = radius * math.sin(theta)
            gz = 0.02 * i
            half = theta / 2.0
            gqx, gqy, gqz, gqw = 0.0, 0.0, math.sin(half), math.cos(half)
            gt_f.write(
                f"{t:.6f} {gx:.6f} {gy:.6f} {gz:.6f} "
                f"{gqx:.6f} {gqy:.6f} {gqz:.6f} {gqw:.6f}\n"
            )

            # estimate: small, deterministic, slowly-growing drift from GT
            # (plausible odometry-style behavior, not random noise per pose)
            drift = 0.01 * i
            ex = gx + drift * 0.5
            ey = gy + drift * 0.3
            ez = gz + drift * 0.1
            est_f.write(
                f"{t:.6f} {ex:.6f} {ey:.6f} {ez:.6f} "
                f"{gqx:.6f} {gqy:.6f} {gqz:.6f} {gqw:.6f}\n"
            )


def verify_results_log(path):
    with open(path) as f:
        lines = [l.rstrip("\n") for l in f]
    assert lines[0] == MARKER, lines[0]
    assert lines[1] == "Run,Dataset,RMSE", lines[1]
    data_lines = lines[2:]
    by_run = {}
    for line in data_lines:
        run_s, dataset, rmse_s = line.split(",")
        by_run.setdefault(int(run_s), []).append((dataset, float(rmse_s)))
    assert len(by_run) == 5, by_run.keys()
    assert len(by_run[MISSING_SEQUENCE_RUN]) == len(SEQUENCES)  # 4 seqs + Average
    seqs_in_missing_run = {d for d, _ in by_run[MISSING_SEQUENCE_RUN] if d != "Average"}
    assert MISSING_SEQUENCE not in seqs_in_missing_run
    print(f"OK  {path}: {len(data_lines)} data rows across {len(by_run)} runs")
    for run, rows in sorted(by_run.items()):
        names = [d for d, _ in rows]
        print(f"    run {run}: {names}")


def verify_pose_file(path, expected_n):
    with open(path) as f:
        lines = [l for l in f if l.strip() and not l.startswith("#")]
    assert len(lines) == expected_n, (path, len(lines), expected_n)
    prev_t = None
    for line in lines:
        fields = line.split()
        assert len(fields) == 8, line
        vals = [float(x) for x in fields]
        assert all(math.isfinite(v) for v in vals)
        t = vals[0]
        assert prev_t is None or t >= prev_t
        prev_t = t
        qx, qy, qz, qw = vals[4:]
        norm = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw)
        assert abs(norm - 1.0) < 1e-6, norm
    print(f"OK  {path}: {len(lines)} valid TUM pose lines")


def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(POSE_PAIRS_DIR, exist_ok=True)

    rng = random.Random(20260728)
    rows = build_rows(rng)
    log_path = os.path.join(RESULTS_DIR, "tum_results_w16.txt")
    write_results_log(log_path, rows)
    verify_results_log(log_path)

    gt_path = os.path.join(POSE_PAIRS_DIR, "gt.txt")
    est_path = os.path.join(POSE_PAIRS_DIR, "est.txt")
    make_pose_pair(gt_path, est_path, n=24, seed=1)
    verify_pose_file(gt_path, 24)
    verify_pose_file(est_path, 24)


if __name__ == "__main__":
    main()
