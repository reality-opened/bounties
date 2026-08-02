#!/usr/bin/env python3
"""Validate a merged colored point-cloud PLY against docs/schemas.md section 3.

Usage:
    python3 check_ply.py <path/to/cloud.ply>

Exit code 0 = passes every rule. Exit code 1 = at least one violation.
Requires numpy (used to bulk-parse the binary vertex block; the header is
parsed with plain Python since it's just ASCII text).
"""

import math
import struct
import sys

try:
    import numpy as np
except ImportError:
    print("check_ply.py requires numpy (pip install numpy)", file=sys.stderr)
    sys.exit(2)

EXPECTED_PROPERTIES = [
    ("float", "x"),
    ("float", "y"),
    ("float", "z"),
    ("uchar", "red"),
    ("uchar", "green"),
    ("uchar", "blue"),
]
# PLY allows a couple of standard type spellings for the same underlying type.
TYPE_ALIASES = {
    "float": "float", "float32": "float",
    "uchar": "uchar", "uint8": "uchar",
}
ALLOWED_FORMATS = {"ascii", "binary_little_endian"}


def _read_header(f):
    """Reads header lines (as text) up to and including 'end_header'.
    Returns (magic_ok, fmt, properties, vertex_count, body_offset, errors).
    """
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
            ptype, pname = parts[1], parts[2]
            properties.append((ptype, pname))

    return fmt, properties, vertex_count, f.tell(), errors


def check_ply_file(path):
    violations = []

    try:
        with open(path, "rb") as f:
            fmt, properties, vertex_count, body_offset, header_errors = _read_header(f)
            violations.extend(header_errors)
            if header_errors:
                return violations

            if fmt not in ALLOWED_FORMATS:
                violations.append(
                    f"format '{fmt}' not allowed; expected one of {sorted(ALLOWED_FORMATS)}"
                )
                return violations

            normalized = [(TYPE_ALIASES.get(t, t), n) for t, n in properties]
            expected_names = [n for _, n in EXPECTED_PROPERTIES]
            expected_types = [t for t, _ in EXPECTED_PROPERTIES]
            got_names = [n for _, n in normalized]
            got_types = [t for t, _ in normalized]

            if got_names != expected_names or got_types != expected_types:
                violations.append(
                    "vertex properties do not match the required schema exactly.\n"
                    f"      expected (in order): {EXPECTED_PROPERTIES}\n"
                    f"      got (in order):      {properties}"
                )
                return violations

            if vertex_count is None or vertex_count < 0:
                violations.append("missing or invalid 'element vertex <N>' count")
                return violations

            f.seek(body_offset)
            body = f.read()

        if fmt == "binary_little_endian":
            record_size = 3 * 4 + 3 * 1  # 3 float32 + 3 uint8
            expected_bytes = vertex_count * record_size
            if len(body) != expected_bytes:
                violations.append(
                    f"binary body is {len(body)} bytes, expected {expected_bytes} "
                    f"({vertex_count} vertices * {record_size} bytes/vertex)"
                )
                return violations
            fmt_str = "<" + "3f3B" * vertex_count
            values = struct.unpack(fmt_str, body)
            xyz = np.array(values, dtype=object).reshape(vertex_count, 6)
            floats = np.array(xyz[:, :3].tolist(), dtype=np.float64)
            colors = np.array(xyz[:, 3:].tolist(), dtype=np.int64)
            if not np.isfinite(floats).all():
                n_bad = int((~np.isfinite(floats)).any(axis=1).sum())
                violations.append(f"{n_bad} vertex/vertices have a non-finite x/y/z value")
            # uchar is inherently 0-255 once unpacked with 'B', so no extra range check needed.
        else:  # ascii
            lines = [ln for ln in body.decode("ascii", errors="replace").split("\n") if ln.strip() != ""]
            if len(lines) != vertex_count:
                violations.append(
                    f"ascii body has {len(lines)} data line(s), expected {vertex_count}"
                )
                return violations
            for i, line in enumerate(lines):
                tokens = line.split()
                if len(tokens) != 6:
                    violations.append(f"data line {i}: expected 6 fields (x y z r g b), got {len(tokens)}")
                    continue
                try:
                    x, y, z = (float(tokens[0]), float(tokens[1]), float(tokens[2]))
                    r, g, b = (int(tokens[3]), int(tokens[4]), int(tokens[5]))
                except ValueError as exc:
                    violations.append(f"data line {i}: could not parse fields ({exc})")
                    continue
                if not all(math.isfinite(v) for v in (x, y, z)):
                    violations.append(f"data line {i}: non-finite x/y/z value")
                for name, v in (("red", r), ("green", g), ("blue", b)):
                    if not (0 <= v <= 255):
                        violations.append(f"data line {i}: {name}={v} out of uchar range [0, 255]")

    except OSError as exc:
        return [f"could not read file: {exc}"]

    return violations


def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <path/to/cloud.ply>", file=sys.stderr)
        return 2

    path = argv[1]
    violations = check_ply_file(path)

    if not violations:
        print(f"OK: {path} is a valid merged colored point-cloud PLY")
        return 0

    print(f"FAIL: {path} has {len(violations)} violation(s):")
    for v in violations:
        print(f"  - {v}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
