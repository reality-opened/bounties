#!/usr/bin/env python3
"""Regenerate the hand-authored fixtures in ../fixtures/ deterministically.

Stdlib-only (no numpy, no third-party deps) so it can run anywhere Python 3
runs. Every fixture is built from the same clean base trajectory (20 poses,
a slow yaw rotation over a straight-line dolly move) and then corrupted in
one specific, documented way. Re-running this script reproduces byte-identical
output every time -- there is no randomness anywhere in this file.

Usage:
    python3 make_fixtures.py
"""

import math
import os

FRAME_COUNT = 20
FIXTURES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")


def clean_pose_lines(n=FRAME_COUNT):
    """A clean, valid TUM trajectory: constant-velocity dolly along +x,
    slow yaw (rotation about z) building up over the sequence. Every line
    is well-formed, timestamps are strictly increasing, quaternions are
    unit-norm, all values finite.
    """
    lines = []
    for i in range(n):
        t = i * 0.1  # seconds, 10 fps
        tx = i * 0.05  # meters
        ty = 0.0
        tz = 1.0
        yaw = i * 0.02  # radians, slow yaw build-up
        qx = 0.0
        qy = 0.0
        qz = math.sin(yaw / 2.0)
        qw = math.cos(yaw / 2.0)
        lines.append((t, tx, ty, tz, qx, qy, qz, qw))
    return lines


def format_line(fields):
    return " ".join(f"{v:.8f}" for v in fields)


def write_lines(name, lines, header_comment=None):
    path = os.path.join(FIXTURES_DIR, name)
    with open(path, "w") as f:
        if header_comment:
            f.write(f"# {header_comment}\n")
        for fields in lines:
            f.write(format_line(fields) + "\n")
    return path


def make_clean():
    lines = clean_pose_lines()
    return write_lines(
        "clean_20.txt",
        lines,
        header_comment="clean 20-pose fixture: monotonic timestamps, unit quaternions, all finite",
    )


def make_nonmonotonic():
    lines = clean_pose_lines()
    # Corrupt line index 12 (0-indexed) by yanking its timestamp backwards
    # past line 11's timestamp -- a single, isolated non-monotonic step.
    bad_index = 12
    t, tx, ty, tz, qx, qy, qz, qw = lines[bad_index]
    lines[bad_index] = (lines[bad_index - 2][0], tx, ty, tz, qx, qy, qz, qw)
    return write_lines(
        "nonmonotonic.txt",
        lines,
        header_comment=f"corruption: line {bad_index + 2} (1-indexed, after this comment) has a timestamp "
        "that goes backwards relative to the previous line",
    )


def make_nonunit_quat():
    lines = clean_pose_lines()
    # Corrupt line index 7 by scaling the quaternion by 1.25x -- well outside
    # the 1e-6 unit-norm tolerance, but every field is still a well-formed
    # finite float.
    bad_index = 7
    t, tx, ty, tz, qx, qy, qz, qw = lines[bad_index]
    scale = 1.25
    lines[bad_index] = (t, tx, ty, tz, qx * scale, qy * scale, qz * scale, qw * scale)
    return write_lines(
        "nonunit_quat.txt",
        lines,
        header_comment=f"corruption: line {bad_index + 2} (1-indexed, after this comment) has a quaternion "
        "scaled by 1.25x (norm far outside the 1e-6 tolerance)",
    )


def make_nan_values():
    lines = clean_pose_lines()
    # Corrupt line index 15 by setting ty to NaN.
    bad_index = 15
    t, tx, ty, tz, qx, qy, qz, qw = lines[bad_index]
    lines[bad_index] = (t, tx, float("nan"), tz, qx, qy, qz, qw)
    path = os.path.join(FIXTURES_DIR, "nan_values.txt")
    with open(path, "w") as f:
        f.write(
            f"# corruption: line {bad_index + 2} (1-indexed, after this comment) has ty = nan\n"
        )
        for fields in lines:
            t_, tx_, ty_, tz_, qx_, qy_, qz_, qw_ = fields
            if math.isnan(ty_):
                f.write(f"{t_:.8f} {tx_:.8f} nan {tz_:.8f} {qx_:.8f} {qy_:.8f} {qz_:.8f} {qw_:.8f}\n")
            else:
                f.write(format_line(fields) + "\n")
    return path


def main():
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    made = [
        make_clean(),
        make_nonmonotonic(),
        make_nonunit_quat(),
        make_nan_values(),
    ]
    for path in made:
        print(f"wrote {os.path.relpath(path)}")


if __name__ == "__main__":
    main()
