#!/usr/bin/env python3
"""Validate a 3DGS splat PLY against docs/schemas.md section 4.

Usage:
    python3 check_splat.py <path/to/splat.ply>

Exit code 0 = passes every rule. Exit code 1 = at least one violation.
Requires numpy (used to bulk-parse and vectorize the 17-float32-field binary
vertex block).
"""

import sys

try:
    import numpy as np
except ImportError:
    print("check_splat.py requires numpy (pip install numpy)", file=sys.stderr)
    sys.exit(2)

SPLAT_FIELDS = [
    "x", "y", "z",
    "nx", "ny", "nz",
    "f_dc_0", "f_dc_1", "f_dc_2",
    "opacity",
    "scale_0", "scale_1", "scale_2",
    "rot_0", "rot_1", "rot_2", "rot_3",
]
SH_C0 = 0.28209479177387814
# Small margin above the theoretical [-0.5/SH_C0, 0.5/SH_C0] range to absorb
# float32 round-trip error without masking a genuine raw-RGB-instead-of-SH-DC bug.
F_DC_MARGIN = 1e-3
F_DC_BOUND = 0.5 / SH_C0 + F_DC_MARGIN
QUAT_TOL = 1e-3


def _read_header(f):
    errors = []
    magic = f.readline()
    if magic.strip() != b"ply":
        errors.append("file does not start with the 'ply' magic line")

    fmt = None
    vertex_count = None
    properties = []
    in_vertex_element = False

    while True:
        line = f.readline()
        if line == b"":
            errors.append("hit EOF before 'end_header'")
            return fmt, properties, vertex_count, f.tell(), errors
        text = line.decode("ascii", errors="replace").strip()
        if text == "end_header":
            break
        parts = text.split()
        if not parts:
            continue
        if parts[0] == "format":
            fmt = parts[1] if len(parts) > 1 else None
        elif parts[0] == "element":
            in_vertex_element = parts[1] == "vertex"
            if in_vertex_element:
                vertex_count = int(parts[2])
        elif parts[0] == "property" and in_vertex_element:
            properties.append((parts[1], parts[2]))

    return fmt, properties, vertex_count, f.tell(), errors


def check_splat_file(path):
    violations = []

    try:
        with open(path, "rb") as f:
            fmt, properties, vertex_count, body_offset, header_errors = _read_header(f)
            violations.extend(header_errors)
            if header_errors:
                return violations

            if fmt != "binary_little_endian":
                violations.append(
                    f"format '{fmt}' not allowed; splat PLYs must be 'binary_little_endian' (no ASCII variant)"
                )
                return violations

            got_names = [n for _, n in properties]
            got_types = [t for t, _ in properties]
            if got_names != SPLAT_FIELDS:
                violations.append(
                    "vertex properties do not match the required 17-field schema exactly.\n"
                    f"      expected (in order): {SPLAT_FIELDS}\n"
                    f"      got (in order):      {got_names}"
                )
                return violations
            if any(t not in ("float", "float32") for t in got_types):
                violations.append(f"all 17 properties must be declared float/float32; got types {got_types}")
                return violations

            if vertex_count is None or vertex_count < 0:
                violations.append("missing or invalid 'element vertex <N>' count")
                return violations

            f.seek(body_offset)
            body = f.read()
    except OSError as exc:
        return [f"could not read file: {exc}"]

    expected_bytes = vertex_count * 17 * 4
    if len(body) != expected_bytes:
        violations.append(
            f"binary body is {len(body)} bytes, expected {expected_bytes} "
            f"({vertex_count} vertices * 17 float32 fields * 4 bytes)"
        )
        return violations

    dtype = np.dtype([(name, "<f4") for name in SPLAT_FIELDS])
    verts = np.frombuffer(body, dtype=dtype, count=vertex_count)

    all_finite = True
    for name in SPLAT_FIELDS:
        col = verts[name]
        if not np.isfinite(col).all():
            all_finite = False
            n_bad = int((~np.isfinite(col)).sum())
            violations.append(f"field '{name}': {n_bad} non-finite value(s)")
    if not all_finite:
        return violations  # downstream numeric checks aren't meaningful on non-finite data

    for name in ("f_dc_0", "f_dc_1", "f_dc_2"):
        col = verts[name]
        out_of_range = np.abs(col) > F_DC_BOUND
        if out_of_range.any():
            n_bad = int(out_of_range.sum())
            violations.append(
                f"field '{name}': {n_bad} value(s) outside [-{F_DC_BOUND:.4f}, {F_DC_BOUND:.4f}] "
                "(SH-DC range implied by a [0,1] source color) -- looks like raw RGB was written "
                "instead of the SH-DC encoding"
            )

    quat = np.stack([verts["rot_0"], verts["rot_1"], verts["rot_2"], verts["rot_3"]], axis=1)
    norms = np.linalg.norm(quat, axis=1)
    bad_norm = np.abs(norms - 1.0) > QUAT_TOL
    if bad_norm.any():
        n_bad = int(bad_norm.sum())
        max_dev = float(np.max(np.abs(norms - 1.0)))
        violations.append(
            f"{n_bad} rotation quaternion(s) deviate from unit norm by more than {QUAT_TOL:.0e} "
            f"(max deviation observed: {max_dev:.6f})"
        )

    return violations


def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <path/to/splat.ply>", file=sys.stderr)
        return 2

    path = argv[1]
    violations = check_splat_file(path)

    if not violations:
        print(f"OK: {path} is a valid 3DGS splat PLY")
        return 0

    print(f"FAIL: {path} has {len(violations)} violation(s):")
    for v in violations:
        print(f"  - {v}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
