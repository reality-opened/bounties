#!/usr/bin/env python3
"""Validate a per-frame point-cloud/mask NPZ against docs/schemas.md section 2.

Usage:
    python3 check_npz.py <path/to/frame.npz>

Exit code 0 = passes every rule. Exit code 1 = at least one violation.
Requires numpy (the format itself is a numpy .npz archive, so this is not an
extra dependency beyond what any consumer would need).
"""

import sys

try:
    import numpy as np
except ImportError:
    print("check_npz.py requires numpy (pip install numpy)", file=sys.stderr)
    sys.exit(2)

REQUIRED_KEYS = {"pointcloud", "mask"}


def check_npz_file(path):
    violations = []

    try:
        with np.load(path) as data:
            keys = set(data.files)
            missing = REQUIRED_KEYS - keys
            extra = keys - REQUIRED_KEYS
            if missing:
                violations.append(f"missing required key(s): {sorted(missing)}")
            if extra:
                violations.append(f"unexpected extra key(s) (schema requires exactly {sorted(REQUIRED_KEYS)}): {sorted(extra)}")

            if "pointcloud" not in keys or "mask" not in keys:
                # Can't do the shape/dtype/finiteness checks without both arrays.
                return violations

            pointcloud = data["pointcloud"]
            mask = data["mask"]
    except OSError as exc:
        return [f"could not read file: {exc}"]
    except Exception as exc:  # noqa: BLE001 - surface any npz-parsing error as a violation
        return [f"could not parse as .npz: {exc}"]

    if pointcloud.dtype != np.float32:
        violations.append(f"pointcloud dtype is {pointcloud.dtype}, expected float32")
    if pointcloud.ndim != 3 or pointcloud.shape[-1] != 3:
        violations.append(f"pointcloud shape is {pointcloud.shape}, expected (H, W, 3)")

    if mask.dtype != np.bool_:
        violations.append(f"mask dtype is {mask.dtype}, expected bool")
    if mask.ndim != 2:
        violations.append(f"mask shape is {mask.shape}, expected (H, W)")

    if pointcloud.ndim == 3 and mask.ndim == 2 and pointcloud.shape[:2] != mask.shape:
        violations.append(
            f"pointcloud spatial shape {pointcloud.shape[:2]} does not match mask shape {mask.shape}"
        )
    elif pointcloud.ndim == 3 and mask.ndim == 2:
        # Shapes agree; check the finiteness-under-mask rule.
        valid_points = pointcloud[mask]
        if valid_points.size and not np.isfinite(valid_points).all():
            n_bad = int((~np.isfinite(valid_points)).any(axis=-1).sum())
            violations.append(
                f"{n_bad} point(s) with mask == True have a non-finite (x, y, z) value"
            )

    return violations


def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <path/to/frame.npz>", file=sys.stderr)
        return 2

    path = argv[1]
    violations = check_npz_file(path)

    if not violations:
        print(f"OK: {path} is a valid per-frame NPZ")
        return 0

    print(f"FAIL: {path} has {len(violations)} violation(s):")
    for v in violations:
        print(f"  - {v}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
