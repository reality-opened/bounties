#!/usr/bin/env python3
"""Validate a TUM pose file against docs/schemas.md section 1.

Usage:
    python3 check_tum.py <path/to/trajectory.txt>

Exit code 0 = passes every rule. Exit code 1 = at least one violation
(all violations are printed, with 1-indexed line numbers, before exiting).
This is a pure-stdlib script (no numpy) -- the TUM format itself has no
array/binary payload.
"""

import math
import sys

QUAT_TOL = 1e-6


def check_tum_file(path):
    """Returns a list of human-readable violation strings (empty == valid)."""
    violations = []
    pose_lines = []  # (file_line_no, timestamp, tx, ty, tz, qx, qy, qz, qw)

    try:
        with open(path, "r") as f:
            raw_lines = f.readlines()
    except OSError as exc:
        return [f"could not read file: {exc}"]

    for line_no, raw in enumerate(raw_lines, start=1):
        stripped = raw.strip()
        if stripped == "" or stripped.startswith("#"):
            continue

        tokens = stripped.split()
        if len(tokens) != 8:
            violations.append(
                f"line {line_no}: malformed line, expected 8 fields, got {len(tokens)}"
            )
            continue

        try:
            values = [float(tok) for tok in tokens]
        except ValueError as exc:
            violations.append(f"line {line_no}: malformed line, could not parse a float ({exc})")
            continue

        timestamp, tx, ty, tz, qx, qy, qz, qw = values

        if not all(math.isfinite(v) for v in values):
            violations.append(f"line {line_no}: non-finite value (NaN/Inf) in pose fields")
            # still record the pose so downstream monotonicity checks have
            # a timestamp to compare against, but skip the quaternion check
            # for this line since it would be meaningless.
            pose_lines.append((line_no, timestamp, tx, ty, tz, qx, qy, qz, qw))
            continue

        norm = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw)
        if abs(norm - 1.0) > QUAT_TOL:
            violations.append(
                f"line {line_no}: non-unit quaternion, ||q|| = {norm:.9f} "
                f"(deviates from 1.0 by {abs(norm - 1.0):.2e}, tolerance {QUAT_TOL:.0e})"
            )

        pose_lines.append((line_no, timestamp, tx, ty, tz, qx, qy, qz, qw))

    # Monotonic timestamp check across consecutive *parsed* pose lines.
    for prev, cur in zip(pose_lines, pose_lines[1:]):
        prev_line_no, prev_t = prev[0], prev[1]
        cur_line_no, cur_t = cur[0], cur[1]
        if math.isnan(prev_t) or math.isnan(cur_t):
            continue  # already flagged as non-finite above
        if cur_t < prev_t:
            violations.append(
                f"line {cur_line_no}: non-monotonic timestamp ({cur_t} < {prev_t} on line {prev_line_no})"
            )

    if len(pose_lines) < 2:
        violations.append(
            f"file has {len(pose_lines)} pose line(s); at least 2 are required"
        )

    return violations


def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <path/to/trajectory.txt>", file=sys.stderr)
        return 2

    path = argv[1]
    violations = check_tum_file(path)

    if not violations:
        print(f"OK: {path} is a valid TUM pose file")
        return 0

    print(f"FAIL: {path} has {len(violations)} violation(s):")
    for v in violations:
        print(f"  - {v}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
