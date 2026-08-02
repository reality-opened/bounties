#!/usr/bin/env python
"""Run the real Isaac export on a tiny synthetic scan (no GPU / SLAM / weights).

Builds a duck-typed fake scan (a dominant floor + a few above points + cameras above the
floor), runs the production ``export_isaac``, and prints the output dir. Pair with
``reference/inspect_isaac.py`` to validate the tree. open3d absent -> points-only fallback
(the code degrades gracefully); usd-core (``pxr``) is a hard requirement -- there is no
fallback for a missing USD writer.

    python scripts/make_isaac_fixture.py --out ./local_isaac_fixture --scale 0.25
    python reference/inspect_isaac.py --isaac ./local_isaac_fixture/fixture/isaac

KIT NOTE: this runs the real ``server/export/isaac/`` code (docs/isaac-export.md), vendored
read-only under ``vendor/`` so this kit needs no checkout of the ``server``/``core`` repos --
just ``pip install numpy scipy pydantic usd-core`` (+ ``open3d`` for the mesh/collider path;
without it the export still succeeds as a points-only scene). The only change from the
upstream script is the ``sys.path`` line below (points at ``vendor/`` instead of a repo root);
nothing in the export logic itself is touched.
"""

from __future__ import annotations

import argparse
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vendor"))

import tests.export_fakes as fakes  # noqa: E402
from server.export.isaac.writer import export_isaac  # noqa: E402


def build_fake_solver(scale_k: float):
    rng = np.random.default_rng(0)
    floor = rng.uniform([-2, -2, 0], [2, 2, 0], size=(1500, 3))
    floor[:, 2] = 0.0
    above = rng.uniform([-1, -1, 0.3], [1, 1, 1.8], size=(300, 3))
    pts = np.vstack([floor, above]) * scale_k
    cols = rng.integers(0, 255, size=(len(pts), 3), dtype=np.uint8)
    cams = [
        (fakes.rot(0, 0, 0), np.array([0, 0, 1.5]) * scale_k),
        (fakes.rot(0, 0.3, 0), np.array([0.5, 0, 1.5]) * scale_k),
        (fakes.rot(0, -0.3, 0), np.array([-0.5, 0, 1.5]) * scale_k),
    ]
    submap = fakes.FakeSubmap(0, cams, points=pts, colors=cols)
    return fakes.FakeSolver(fakes.FakeMap([submap]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="./local_isaac_fixture")
    ap.add_argument("--scale", type=float, default=0.25, help="SLAM->meters factor (scene built at 1/scale)")
    ap.add_argument("--no-mesh", action="store_true", help="force the points-only scene")
    args = ap.parse_args()

    solver = build_fake_solver(scale_k=1.0 / args.scale)
    isaac_dir = export_isaac(
        solver,
        out_dir=args.out,
        scan_id="fixture",
        scale=args.scale,
        reconstruct=not args.no_mesh,
    )
    print(f"\nIsaac fixture written: {isaac_dir}")
    print(f"Validate it:\n    python reference/inspect_isaac.py --isaac {isaac_dir}")


if __name__ == "__main__":
    main()
