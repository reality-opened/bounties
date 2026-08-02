#!/usr/bin/env python
"""Dump + sanity-check an OpenReality export tree and/or its GR00T-LeRobot v2 transcode.

Run this on an export you produced (locally via make_local_export_fixture.py, or downloaded
from the Modal test app) and **paste the output back** — it's the fastest way to verify the
format is correct without shipping large binaries around.

    python scripts/inspect_export.py --export ./export_results/exports/<scan>
    python scripts/inspect_export.py --export <openreality_dir> --groot <groot_dir>

It prints: the file tree, meta JSON (info/episode/modality/tasks/episodes), the parquet
schema + first row, the mp4 frame count, the cloud shape, a few annotation/grounding lines,
and a PASS/FAIL block for the cross-file invariants from docs/dataset-export.md §7/§9.
"""

from __future__ import annotations

import argparse
import json
import os


def _hr(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def _tree(root):
    for dirpath, _dirs, files in os.walk(root):
        for fn in sorted(files):
            p = os.path.join(dirpath, fn)
            print(f"  {os.path.getsize(p):>12,d}  {os.path.relpath(p, root)}")


def _read_json(p):
    with open(p) as f:
        return json.load(f)


def _read_jsonl(p, limit=None):
    out = []
    if not os.path.isfile(p):
        return out
    with open(p) as f:
        for i, line in enumerate(f):
            line = line.strip()
            if line:
                out.append(json.loads(line))
            if limit and len(out) >= limit:
                break
    return out


def _video_frames(path):
    try:
        import cv2
    except Exception:
        return None
    cap = cv2.VideoCapture(path)
    n = 0
    while True:
        ok, _f = cap.read()
        if not ok:
            break
        n += 1
    cap.release()
    return n


def inspect_openreality(root):
    _hr(f"OpenReality export: {root}")
    if not os.path.isdir(root):
        print("  MISSING directory"); return None
    print("File tree:")
    _tree(root)

    checks = []

    info_p = os.path.join(root, "meta", "info.json")
    info = _read_json(info_p) if os.path.isfile(info_p) else {}
    _hr("meta/info.json")
    print(json.dumps(info, indent=2))
    checks.append(("info.up_to_scale is True", info.get("up_to_scale") is True))
    checks.append(("info.gravity_aligned is False", info.get("gravity_aligned") is False))
    checks.append(("info.metric is False", info.get("metric") is False))

    ep_p = os.path.join(root, "meta", "episode.json")
    if os.path.isfile(ep_p):
        _hr("meta/episode.json")
        print(json.dumps(_read_json(ep_p), indent=2))

    # trajectory.parquet
    n_rows = None
    parq = os.path.join(root, "data", "trajectory.parquet")
    if os.path.isfile(parq):
        import numpy as np
        import pandas as pd

        df = pd.read_parquet(parq)
        n_rows = len(df)
        _hr("data/trajectory.parquet")
        print("columns:", list(df.columns))
        print("dtypes:\n", df.dtypes)
        print(f"rows: {n_rows}")
        print("first row:")
        for c in df.columns:
            v = df[c].iloc[0]
            print(f"  {c}: {list(v) if hasattr(v, '__len__') and not isinstance(v, str) else v}")
        state = np.vstack(df["observation.state"].to_numpy())
        action = np.vstack(df["action"].to_numpy())
        checks.append(("state width == 7", state.shape[1] == 7))
        checks.append(("action width == 6", action.shape[1] == 6))
        checks.append(("all state finite", bool(np.all(np.isfinite(state)))))
        checks.append(("all action finite", bool(np.all(np.isfinite(action)))))
        checks.append(("last action is zeros", bool(np.allclose(action[-1], 0))))

    # video
    mp4 = os.path.join(root, "videos", "ego_view.mp4")
    if os.path.isfile(mp4):
        nf = _video_frames(mp4)
        _hr("videos/ego_view.mp4")
        print(f"decoded frame count: {nf}  (size {os.path.getsize(mp4):,d} bytes)")
        if nf is not None and n_rows is not None:
            checks.append((f"mp4 frames ({nf}) == parquet rows ({n_rows})", nf == n_rows))

    # cloud
    npz = os.path.join(root, "clouds", "cloud.npz")
    aabb = None
    if os.path.isfile(npz):
        import numpy as np

        with np.load(npz) as cz:
            pos = cz["positions"]; col = cz["colors"]
        _hr("clouds/cloud.npz")
        print(f"positions {pos.shape} {pos.dtype}, colors {col.shape} {col.dtype}")
        if pos.size:
            aabb = (pos.min(0), pos.max(0))
            print(f"AABB min {aabb[0]}  max {aabb[1]}")

    # grounding/objects.jsonl
    obj_p = os.path.join(root, "grounding", "objects.jsonl")
    objs = _read_jsonl(obj_p)
    if objs:
        import numpy as np

        _hr(f"grounding/objects.jsonl  ({len(objs)} objects, showing up to 3)")
        for o in objs[:3]:
            print(json.dumps(o, indent=2))
        if n_rows is not None:
            in_range = all(
                0 <= ev.get("global_frame_index", -1) < n_rows
                for o in objs for ev in o.get("evidence", [])
            )
            checks.append(("every objects.jsonl global_frame_index in [0,N)", in_range))
        if aabb is not None:
            inside = all(
                np.all(np.asarray(o["world_center"]) >= aabb[0] - 1e-6)
                and np.all(np.asarray(o["world_center"]) <= aabb[1] + 1e-6)
                for o in objs if o.get("world_center")
            )
            checks.append(("object centers inside cloud AABB", inside))

    # annotations.jsonl
    ann = _read_jsonl(os.path.join(root, "meta", "annotations.jsonl"))
    if ann:
        _hr(f"meta/annotations.jsonl  ({len(ann)} lines, showing up to 5)")
        for a in ann[:5]:
            print(json.dumps(a, indent=2))
        if n_rows is not None:
            ok = all(0 <= a["frame_start"] <= a["frame_end"] < n_rows for a in ann)
            checks.append(("every annotation window in [0,N)", ok))

    return checks


def inspect_groot(root):
    _hr(f"GR00T-LeRobot v2: {root}")
    if not os.path.isdir(root):
        print("  MISSING directory"); return None
    print("File tree:")
    _tree(root)
    checks = []

    info_p = os.path.join(root, "meta", "info.json")
    if os.path.isfile(info_p):
        info = _read_json(info_p)
        _hr("meta/info.json")
        print(json.dumps(info, indent=2))
        checks.append(("codebase_version starts with v2", str(info.get("codebase_version", "")).startswith("v2")))

    mod_p = os.path.join(root, "meta", "modality.json")
    if os.path.isfile(mod_p):
        mod = _read_json(mod_p)
        _hr("meta/modality.json")
        print(json.dumps(mod, indent=2))
        st = mod.get("state", {}).get("camera_pose", {})
        ac = mod.get("action", {}).get("ego_motion", {})
        checks.append(("modality state width == 7", st.get("end", 0) - st.get("start", 0) == 7))
        checks.append(("modality action width == 6", ac.get("end", 0) - ac.get("start", 0) == 6))

    tasks = _read_jsonl(os.path.join(root, "meta", "tasks.jsonl"))
    eps = _read_jsonl(os.path.join(root, "meta", "episodes.jsonl"))
    _hr("meta/tasks.jsonl"); [print(json.dumps(t)) for t in tasks]
    _hr("meta/episodes.jsonl"); [print(json.dumps(e)) for e in eps]

    parq = os.path.join(root, "data", "chunk-000", "episode_000000.parquet")
    if os.path.isfile(parq):
        import pandas as pd

        df = pd.read_parquet(parq)
        _hr("data/chunk-000/episode_000000.parquet")
        print("columns:", list(df.columns))
        print("dtypes:\n", df.dtypes)
        print(f"rows: {len(df)}")
        valid = {t["task_index"] for t in tasks}
        for col in ("task_index", "annotation.human.action.task_description", "annotation.scene.caption"):
            if col in df.columns:
                sub = set(int(v) for v in df[col])
                checks.append((f"{col} indices all in tasks.jsonl", sub.issubset(valid)))

    mp4 = os.path.join(root, "videos", "chunk-000",
                       "observation.images.ego_view", "episode_000000.mp4")
    checks.append(("episode mp4 present", os.path.isfile(mp4)))
    return checks


def _report(name, checks):
    if checks is None:
        return
    _hr(f"CHECKS — {name}")
    for label, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}]  {label}")


def main():
    ap = argparse.ArgumentParser(description="Inspect an OpenReality / GR00T export")
    ap.add_argument("--export", help="OpenReality export dir (export/<scan>/)")
    ap.add_argument("--groot", help="GR00T-LeRobot v2 dir")
    args = ap.parse_args()
    if not args.export and not args.groot:
        ap.error("pass --export and/or --groot")

    or_checks = inspect_openreality(args.export) if args.export else None
    gr_checks = inspect_groot(args.groot) if args.groot else None
    _report("OpenReality", or_checks)
    _report("GR00T", gr_checks)


if __name__ == "__main__":
    main()
