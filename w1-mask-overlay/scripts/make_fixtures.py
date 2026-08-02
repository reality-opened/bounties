#!/usr/bin/env python3
"""Generate mask-RLE fixtures for the mask-overlay bounty kit.

Stdlib only (no numpy) — implements the SAME encoding the server uses
(row-major "C" order, alternating runs, always starting with a `False` run;
see `docs/rle-format.md` in this kit for the full written spec). This script
is a from-scratch reimplementation for the fixture generator, not a copy of
any server source file.

Each fixture is a JSON file with:
    {
      "name": str,
      "description": str,
      "valid": bool,
      "mask_rle": {"size": [H, W], "counts": [...], "order": "C"},
      "decoded": [[0/1, ...], ...] or null   # H x W, oracle for decodeMaskRle
      "expected_error": str or null          # present (non-null) iff valid == false
    }

Run: python3 scripts/make_fixtures.py
Writes into ../fixtures/ (relative to this script) and prints PASS/FAIL per
fixture from a self-check: encode(decoded) round-trips to the same counts,
and decode(mask_rle) round-trips to the same matrix.
"""

from __future__ import annotations

import json
import os
from typing import List, Optional

Matrix = List[List[int]]


def mask_to_rle(rows: Matrix) -> dict:
    """Encode a 0/1 matrix (H rows x W cols) into the compact RLE dict.

    Row-major (C order) runs, alternating, always starting with a `False` run
    (a leading run of length 0 if the mask itself starts with `True`).
    """
    h = len(rows)
    w = len(rows[0]) if h else 0
    flat = [bool(v) for row in rows for v in row]

    if not flat:
        return {"size": [h, w], "counts": [], "order": "C"}

    counts: List[int] = []
    current = flat[0]
    run = 1
    for v in flat[1:]:
        if v == current:
            run += 1
        else:
            counts.append(run)
            current = v
            run = 1
    counts.append(run)

    if flat[0]:  # mask starts True -> lead with an empty False run
        counts = [0] + counts

    return {"size": [h, w], "counts": counts, "order": "C"}


def rle_to_mask(rle: dict) -> Optional[Matrix]:
    """Decode an RLE dict back into a 0/1 matrix, or None if inconsistent/invalid."""
    if not isinstance(rle, dict):
        return None
    size = rle.get("size")
    counts = rle.get("counts")
    if not size or counts is None or len(size) != 2:
        return None
    try:
        h, w = int(size[0]), int(size[1])
    except (TypeError, ValueError):
        return None

    flat = [0] * (h * w)
    pos = 0
    value = False
    for c in counts:
        try:
            c = int(c)
        except (TypeError, ValueError):
            return None
        if value and c > 0:
            for i in range(pos, pos + c):
                if 0 <= i < len(flat):
                    flat[i] = 1
        pos += c
        value = not value

    if pos != h * w:
        return None

    return [flat[r * w:(r + 1) * w] for r in range(h)]


def make_filled_square(size: int, side: int) -> Matrix:
    lo = (size - side) // 2
    hi = lo + side
    return [[1 if (lo <= r < hi and lo <= c < hi) else 0 for c in range(size)] for r in range(size)]


def make_ring(size: int, inner: float, outer: float) -> Matrix:
    cx = cy = (size - 1) / 2.0
    rows: Matrix = []
    for r in range(size):
        row = []
        for c in range(size):
            d = ((r - cy) ** 2 + (c - cx) ** 2) ** 0.5
            row.append(1 if inner <= d <= outer else 0)
        rows.append(row)
    return rows


def make_diagonal(size: int, band: int) -> Matrix:
    return [[1 if abs(r - c) <= band else 0 for c in range(size)] for r in range(size)]


def make_empty(h: int, w: int) -> Matrix:
    return [[0] * w for _ in range(h)]


def build_fixtures() -> List[dict]:
    fixtures: List[dict] = []

    # 1. Filled square, small end of the size range.
    square = make_filled_square(16, 8)
    fixtures.append({
        "name": "filled_square_16x16",
        "description": "16x16 mask, an 8x8 filled square centered in the frame.",
        "valid": True,
        "mask_rle": mask_to_rle(square),
        "decoded": square,
        "expected_error": None,
    })

    # 2. Ring / annulus.
    ring = make_ring(32, 10.0, 14.0)
    fixtures.append({
        "name": "ring_32x32",
        "description": "32x32 mask, an annulus (ring) with inner radius 10 and outer radius 14.",
        "valid": True,
        "mask_rle": mask_to_rle(ring),
        "decoded": ring,
        "expected_error": None,
    })

    # 3. Diagonal band.
    diagonal = make_diagonal(24, 1)
    fixtures.append({
        "name": "diagonal_24x24",
        "description": "24x24 mask, a 3-pixel-wide diagonal band (|row - col| <= 1).",
        "valid": True,
        "mask_rle": mask_to_rle(diagonal),
        "decoded": diagonal,
        "expected_error": None,
    })

    # 4. Empty mask, large end of the size range.
    empty = make_empty(64, 64)
    fixtures.append({
        "name": "empty_64x64",
        "description": "64x64 mask, entirely False (nothing detected/segmented).",
        "valid": True,
        "mask_rle": mask_to_rle(empty),
        "decoded": empty,
        "expected_error": None,
    })

    # 5. Deliberately invalid: counts don't sum to size[0] * size[1].
    #    Start from a valid encoding of a small filled square, then corrupt one run length
    #    so the total no longer covers the frame. This is the shape a corrupt/truncated wire
    #    payload would take, not a type error (size/counts are the right *types*).
    base = make_filled_square(8, 4)
    base_rle = mask_to_rle(base)
    corrupted_counts = list(base_rle["counts"])
    corrupted_counts[-1] = max(0, corrupted_counts[-1] - 3)  # short by 3 pixels
    invalid_rle = {"size": base_rle["size"], "counts": corrupted_counts, "order": "C"}
    total = sum(invalid_rle["counts"])
    expected = invalid_rle["size"][0] * invalid_rle["size"][1]
    fixtures.append({
        "name": "invalid_counts_mismatch_8x8",
        "description": (
            "8x8 mask_rle with a truncated final run: counts sum to "
            f"{total}, but size[0]*size[1] = {expected}. Simulates a corrupt/truncated "
            "wire payload. decodeMaskRle must reject this, not return a short/zero-padded buffer."
        ),
        "valid": False,
        "mask_rle": invalid_rle,
        "decoded": None,
        "expected_error": f"counts sum ({total}) does not match size[0]*size[1] ({expected})",
    })

    return fixtures


def self_check(fixtures: List[dict]) -> bool:
    all_ok = True
    for fx in fixtures:
        name = fx["name"]
        if fx["valid"]:
            re_decoded = rle_to_mask(fx["mask_rle"])
            re_encoded = mask_to_rle(fx["decoded"])
            ok = (re_decoded == fx["decoded"]) and (re_encoded["counts"] == fx["mask_rle"]["counts"])
            print(f"[{'PASS' if ok else 'FAIL'}] {name}: decode(rle)==decoded and encode(decoded)==rle")
        else:
            re_decoded = rle_to_mask(fx["mask_rle"])
            ok = re_decoded is None
            print(f"[{'PASS' if ok else 'FAIL'}] {name}: decode correctly reports invalid (got {re_decoded!r})")
        all_ok = all_ok and ok
    return all_ok


def main() -> None:
    fixtures = build_fixtures()
    ok = self_check(fixtures)

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    for fx in fixtures:
        path = os.path.join(out_dir, f"{fx['name']}.json")
        with open(path, "w") as f:
            json.dump(fx, f, indent=2)
            f.write("\n")
        print(f"wrote {path}")

    print()
    print("ALL PASS" if ok else "SOME FAILED")
    if not ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
