#!/usr/bin/env python3
"""fake_slam.py — a deterministic stub "SLAM binary" for runner development.

This is NOT a SLAM system. It honors the CLI contract in
../docs/cli-contract.md so a benchmark runner can be built and tested
end-to-end without a real SLAM implementation on hand:

    python3 fake_slam.py --image_folder <dir> --log_path <out.txt>

It lists the image files in --image_folder (by sorted filename), and writes
one TUM-format pose line per image to --log_path: a smooth, deterministic
trajectory whose shape (radius, angular speed) is derived from a hash of the
image folder's own name, so different sequences get different-looking (but
always reproducible) fake trajectories, and repeated runs against the same
folder are byte-identical.

Also accepts --log_results as a no-op flag, for CLI-shape parity with this
program's real SLAM binary (whose --log_path only takes effect when
--log_results is also passed — see docs/cli-contract.md). This stub always
writes when given --log_path, regardless of --log_results.
"""
import argparse
import hashlib
import math
import os
import sys

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")


def list_images(folder):
    try:
        names = os.listdir(folder)
    except OSError as exc:
        print(f"fake_slam: cannot read --image_folder {folder!r}: {exc}", file=sys.stderr)
        sys.exit(2)
    images = sorted(n for n in names if n.lower().endswith(IMAGE_EXTENSIONS))
    return images


def seeded_unit(name, salt):
    """Deterministic pseudo-random float in [0, 1) derived from a string."""
    digest = hashlib.sha256(f"{name}:{salt}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / float(0xFFFFFFFF)


def write_tum_trajectory(log_path, n_frames, seed_name):
    radius = 0.5 + seeded_unit(seed_name, "radius")           # (0.5, 1.5)
    freq = 0.04 + 0.06 * seeded_unit(seed_name, "freq")       # (0.04, 0.10) rad/frame
    z_rate = 0.005 + 0.02 * seeded_unit(seed_name, "z_rate")  # (0.005, 0.025)

    out_dir = os.path.dirname(os.path.abspath(log_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(log_path, "w") as f:
        for i in range(n_frames):
            t = float(i)
            theta = freq * i
            tx = radius * math.cos(theta)
            ty = radius * math.sin(theta)
            tz = z_rate * i
            # Smooth yaw-only rotation about z, as a proper unit quaternion,
            # TUM's scalar-last (qx, qy, qz, qw) order.
            half = theta / 2.0
            qx, qy, qz, qw = 0.0, 0.0, math.sin(half), math.cos(half)
            f.write(
                f"{t:.6f} {tx:.6f} {ty:.6f} {tz:.6f} "
                f"{qx:.6f} {qy:.6f} {qz:.6f} {qw:.6f}\n"
            )


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="fake_slam: deterministic stub SLAM CLI for runner development/testing"
    )
    parser.add_argument("--image_folder", required=True, help="Directory of per-frame images")
    parser.add_argument("--log_path", required=True, help="Where to write the TUM-format pose log")
    parser.add_argument(
        "--log_results",
        action="store_true",
        help="No-op flag, accepted only for CLI-shape parity with the real SLAM binary",
    )
    args = parser.parse_args(argv)

    images = list_images(args.image_folder)
    if not images:
        print(f"fake_slam: no images found in {args.image_folder!r}", file=sys.stderr)
        sys.exit(1)

    seed_name = os.path.basename(os.path.normpath(args.image_folder))
    write_tum_trajectory(args.log_path, len(images), seed_name)
    print(f"fake_slam: wrote {len(images)} poses to {args.log_path} (seed={seed_name!r})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
