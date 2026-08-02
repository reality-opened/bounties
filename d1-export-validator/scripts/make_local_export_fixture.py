#!/usr/bin/env python
"""Generate a REAL OpenReality export tree locally — no GPU, no Modal, no VGGT.

Builds a tiny synthetic scan (real camera projection matrices so the production
``decompose_camera`` round-trips, gradient RGB frames so the mp4 has real content, a cube
point cloud) and runs the actual ``export_scene`` + ``convert_to_groot_lerobot`` code paths.

Use this to test the **LeRobot / GR00T loader locally** (the §9.4 step) without booting a
GPU — it exercises the converter + on-disk format, just not real SLAM geometry.

    python scripts/make_local_export_fixture.py --out ./local_fixture --to-lerobot
    # -> ./local_fixture/export/fixture/   (OpenReality tree)
    # -> ./local_fixture/groot/fixture/    (GR00T-LeRobot v2 tree, if --to-lerobot)

Then inspect the tree with ``reference/inspect_export.py --export ... --groot ...``.

KIT NOTE: this runs the real ``server/export/`` code (Stages 1-3 of docs/dataset-export.md),
vendored read-only under ``vendor/`` so this kit needs no checkout of the ``server``/``core``
repos — just ``pip install numpy scipy pandas pyarrow opencv-python-headless pydantic``. The
only change from the upstream script is the ``sys.path`` line below (points at ``vendor/``
instead of a repo root) and dropping a matplotlib-stub shim upstream needs for an unrelated
function; nothing in the export logic itself is touched.
"""

from __future__ import annotations

import argparse
import os
import sys

import numpy as np
from scipy.spatial.transform import Rotation

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vendor"))

from server.export.writer import export_scene
from server.scene_report.schemas import (
    EvidenceRef,
    ObjectInstance,
    SceneFacts,
    SceneMetrics,
    SceneReport,
)

DEFAULT_K = np.array([[600.0, 0.0, 320.0], [0.0, 600.0, 240.0], [0.0, 0.0, 1.0]])


def _proj(K, R_cw, C):
    R_wc = np.asarray(R_cw).T
    C = np.asarray(C, float).reshape(3)
    P = np.asarray(K) @ np.hstack([R_wc, (-R_wc @ C).reshape(3, 1)])
    out = np.eye(4)
    out[:3, :] = P
    return out


def _frames(n, h=240, w=320):
    """(n,3,h,w) float frames in [0,1] with a moving gradient so the mp4 has real content."""
    frames = np.zeros((n, 3, h, w), np.float32)
    gx = np.linspace(0, 1, w)[None, :].repeat(h, 0)
    gy = np.linspace(0, 1, h)[:, None].repeat(w, 1)
    for i in range(n):
        frames[i, 0] = gx
        frames[i, 1] = gy
        frames[i, 2] = (i + 1) / (n + 1)
    return frames


def _cube_points():
    g = np.linspace(0, 2, 6)
    xs, ys, zs = np.meshgrid(g, g, g, indexing="ij")
    pts = np.stack([xs.ravel(), ys.ravel(), zs.ravel()], 1)
    cols = np.full((pts.shape[0], 3), 128, np.uint8)
    return pts, cols


class _Submap:
    def __init__(self, sid, cams, frame_ids, frames, points, colors, lc=False):
        self._id, self._lc = sid, lc
        self._proj = [_proj(DEFAULT_K, R, C) for R, C in cams]
        self._fids = list(frame_ids)
        self._frames = frames
        self._pts, self._cols = points, colors

    def get_id(self):
        return self._id

    def get_lc_status(self):
        return self._lc

    def get_frame_ids(self):
        return list(self._fids)

    def get_all_poses_world(self, graph, give_camera_mat=False):
        return np.stack(self._proj, 0)

    def get_frame_at_index(self, i):
        return self._frames[i]

    def get_points_in_world_frame(self, graph):
        return self._pts

    def get_points_colors(self):
        return self._cols


class _Map:
    def __init__(self, submaps):
        self._d = {s.get_id(): s for s in submaps}

    def ordered_submaps_by_key(self):
        for k in sorted(self._d):
            yield self._d[k]

    def get_submap(self, sid):
        return self._d.get(sid)

    def get_submaps(self):
        return list(self._d.values())


class _Solver:
    def __init__(self, smap):
        self.map = smap
        self.graph = object()


def build_fake_solver(n_keyframes=8):
    pts, cols = _cube_points()
    cams, fids = [], []
    for i in range(n_keyframes):
        cams.append((Rotation.from_euler("y", 0.1 * i).as_matrix(), [0.3 * i, 0.2, 0.2]))
        fids.append(float(i))
    frames = _frames(n_keyframes)
    s0 = _Submap(0, cams, fids, frames, pts, cols)
    return _Solver(_Map([s0]))


def build_report():
    facts = SceneFacts(
        metrics=SceneMetrics(num_submaps=1, num_keyframes=8, trajectory_length=2.1),
        objects=[
            ObjectInstance(
                query="laptop",
                center=[1.0, 1.0, 1.0],
                extent=[0.4, 0.3, 0.02],
                confidence=0.8,
                evidence=[EvidenceRef(submap_id=0, frame_idx=2)],
            )
        ],
        object_counts={"laptop": 1},
    )
    return SceneReport(summary="A small synthetic office.", room_type="office", facts=facts)


def main():
    ap = argparse.ArgumentParser(description="Generate a local OpenReality export fixture")
    ap.add_argument("--out", default="./local_fixture")
    ap.add_argument("--scan-id", default="fixture")
    ap.add_argument("--keyframes", type=int, default=8)
    ap.add_argument("--to-lerobot", action="store_true")
    args = ap.parse_args()

    export_root = os.path.join(args.out, "export")
    solver = build_fake_solver(args.keyframes)
    export_dir = export_scene(
        solver,
        detections=[],
        report=build_report(),
        out_dir=export_root,
        scan_id=args.scan_id,
        fps=10.0,
    )
    print(f"OpenReality tree -> {export_dir}")

    if args.to_lerobot:
        from server.export.to_lerobot import convert_to_groot_lerobot

        groot_dir = os.path.join(args.out, "groot", args.scan_id)
        convert_to_groot_lerobot(export_dir, groot_dir)
        print(f"GR00T-LeRobot v2 tree -> {groot_dir}")

    print("\nInspect it:\n  python reference/inspect_export.py "
          f"--export {export_dir}" + (f" --groot {os.path.join(args.out, 'groot', args.scan_id)}"
                                       if args.to_lerobot else ""))


if __name__ == "__main__":
    main()
