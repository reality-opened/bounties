#!/usr/bin/env python3
"""Generate 2 tiny fake sequences in the 7-Scenes directory shape.

Stdlib-only, deterministic. These are NOT real 7-Scenes data — just enough
directory/file shape (per docs/dataset-pointers.md) for a runner to be
developed and end-to-end tested against stub/fake_slam.py without the real
(multi-GB) dataset.

Usage:
    python3 scripts/make_fixture_sequences.py

Writes, under fixtures/scene-fake/:
    TrainSplit.txt, TestSplit.txt
    seq-01/frame-000000.color.png .. frame-000005.color.png  (empty files)
    seq-01/gt.txt   (synthetic TUM ground-truth trajectory, 6 poses)
    seq-02/frame-000000.color.png .. frame-000007.color.png  (empty files)
    seq-02/gt.txt   (synthetic TUM ground-truth trajectory, 8 poses)

gt.txt is a convenience not present in the real dataset (real 7-Scenes
ships per-frame frame-XXXXXX.pose.txt instead — see dataset-pointers.md);
it's provided here already aggregated into one TUM file per sequence so the
ATE-scoring step of a runner can be exercised immediately.
"""
import math
import os

MARKER = "# SYNTHETIC SAMPLE DATA — not real 7-Scenes data"

HERE = os.path.dirname(os.path.abspath(__file__))
FIXTURES_DIR = os.path.join(os.path.dirname(HERE), "fixtures")
SCENE_DIR = os.path.join(FIXTURES_DIR, "scene-fake")

SEQUENCES = {
    "seq-01": 6,
    "seq-02": 8,
}


def write_split_files():
    os.makedirs(SCENE_DIR, exist_ok=True)
    with open(os.path.join(SCENE_DIR, "TrainSplit.txt"), "w") as f:
        f.write(MARKER + "\n")
        f.write("seq-01\n")
    with open(os.path.join(SCENE_DIR, "TestSplit.txt"), "w") as f:
        f.write(MARKER + "\n")
        f.write("seq-02\n")


def write_color_frames(seq_dir, n_frames):
    for i in range(n_frames):
        path = os.path.join(seq_dir, f"frame-{i:06d}.color.png")
        # Empty placeholder file: fake_slam.py only needs the filename to
        # exist and sort correctly, it never decodes pixel content.
        open(path, "wb").close()


def write_ground_truth(seq_dir, n_frames, seed):
    radius = 1.0 + 0.3 * seed
    freq = 0.10
    path = os.path.join(seq_dir, "gt.txt")
    with open(path, "w") as f:
        f.write(MARKER + "\n")
        for i in range(n_frames):
            t = float(i)
            theta = freq * i
            x = radius * math.cos(theta)
            y = radius * math.sin(theta)
            z = 0.03 * i
            half = theta / 2.0
            qx, qy, qz, qw = 0.0, 0.0, math.sin(half), math.cos(half)
            f.write(
                f"{t:.6f} {x:.6f} {y:.6f} {z:.6f} "
                f"{qx:.6f} {qy:.6f} {qz:.6f} {qw:.6f}\n"
            )


def verify(seq_dir, n_frames):
    color_files = sorted(
        n for n in os.listdir(seq_dir) if n.endswith(".color.png")
    )
    assert len(color_files) == n_frames, (seq_dir, color_files)
    gt_path = os.path.join(seq_dir, "gt.txt")
    with open(gt_path) as f:
        lines = [l for l in f if l.strip() and not l.startswith("#")]
    assert len(lines) == n_frames, (gt_path, len(lines), n_frames)
    for line in lines:
        vals = [float(x) for x in line.split()]
        assert len(vals) == 8
        assert all(math.isfinite(v) for v in vals)
        qx, qy, qz, qw = vals[4:]
        norm = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw)
        assert abs(norm - 1.0) < 1e-6
    print(f"OK  {seq_dir}: {len(color_files)} color frames, gt.txt has {len(lines)} valid TUM poses")


def main():
    write_split_files()
    for idx, (seq_name, n_frames) in enumerate(SEQUENCES.items()):
        seq_dir = os.path.join(SCENE_DIR, seq_name)
        os.makedirs(seq_dir, exist_ok=True)
        write_color_frames(seq_dir, n_frames)
        write_ground_truth(seq_dir, n_frames, seed=idx)
        verify(seq_dir, n_frames)


if __name__ == "__main__":
    main()
