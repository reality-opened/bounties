#!/usr/bin/env python
"""Dump + sanity-check an Isaac USD export (scene.usd + trajectory.usd + manifest.json).

Run this on an Isaac export you produced (via ``main.py --export_isaac`` or the Modal test
app) and **paste the output back** — it verifies the Isaac/USD conventions and cross-file
invariants without shipping the binaries around. Needs ``usd-core`` (``pip install usd-core``).

    python scripts/inspect_isaac.py --isaac ./export_results/<scan>/isaac
"""

from __future__ import annotations

import argparse
import json
import os
import sys

_CHECKS = []


def _hr(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def check(name, cond, detail=""):
    ok = bool(cond)
    _CHECKS.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--isaac", required=True, help="path to a <scan>/isaac directory")
    args = ap.parse_args()

    d = args.isaac
    scene_p = os.path.join(d, "scene.usd")
    traj_p = os.path.join(d, "trajectory.usd")
    man_p = os.path.join(d, "manifest.json")

    _hr(f"Isaac export: {d}")
    for dirpath, _dirs, files in os.walk(d):
        for fn in sorted(files):
            p = os.path.join(dirpath, fn)
            print(f"  {os.path.getsize(p):>12,d}  {os.path.relpath(p, d)}")

    _hr("Files present")
    check("scene.usd exists", os.path.isfile(scene_p))
    check("trajectory.usd exists", os.path.isfile(traj_p))
    check("manifest.json exists", os.path.isfile(man_p))

    manifest = {}
    if os.path.isfile(man_p):
        manifest = json.load(open(man_p))
        _hr("manifest.json")
        print(json.dumps(manifest, indent=2))

    try:
        from pxr import Usd, UsdGeom, UsdPhysics
    except Exception as exc:
        print(f"\n[fatal] usd-core (pxr) not importable: {exc}")
        sys.exit(2)

    align = manifest.get("alignment", {})
    geom = manifest.get("geometry", {})

    _hr("scene.usd invariants")
    if os.path.isfile(scene_p):
        scene = Usd.Stage.Open(scene_p)
        up = UsdGeom.GetStageUpAxis(scene)
        mpu = UsdGeom.GetStageMetersPerUnit(scene)
        check("stage upAxis == Z (Isaac robotics convention)", up == UsdGeom.Tokens.z, f"got {up}")
        check("stage metersPerUnit == 1.0 (meters)", mpu == 1.0, f"got {mpu}")
        check("default prim is /World", str(scene.GetDefaultPrim().GetPath()) == "/World")

        rep = geom.get("representation", "")
        mesh_prim = scene.GetPrimAtPath("/World/Environment")
        pts_prim = scene.GetPrimAtPath("/World/Cloud")
        if "mesh" in rep:
            ok = bool(mesh_prim) and mesh_prim.IsA(UsdGeom.Mesh)
            check("/World/Environment mesh present", ok)
            if ok:
                nverts = len(UsdGeom.Mesh(mesh_prim).GetPointsAttr().Get() or [])
                check("mesh vertex count matches manifest",
                      nverts == geom.get("num_vertices"), f"usd={nverts} manifest={geom.get('num_vertices')}")
                has_col = mesh_prim.HasAPI(UsdPhysics.CollisionAPI)
                check("mesh has UsdPhysics.CollisionAPI (robot can collide)",
                      has_col == geom.get("has_collision", False), f"usd={has_col}")
        if "points" in rep:
            ok = bool(pts_prim) and pts_prim.IsA(UsdGeom.Points)
            check("/World/Cloud points present", ok)
            if ok:
                npts = len(UsdGeom.Points(pts_prim).GetPointsAttr().Get() or [])
                check("point count matches manifest",
                      npts == geom.get("num_points"), f"usd={npts} manifest={geom.get('num_points')}")

    _hr("trajectory.usd invariants")
    if os.path.isfile(traj_p):
        traj = Usd.Stage.Open(traj_p)
        cam = traj.GetPrimAtPath("/World/Camera")
        ok = bool(cam) and cam.IsA(UsdGeom.Camera)
        check("/World/Camera present", ok)
        check("trajectory upAxis == Z", UsdGeom.GetStageUpAxis(traj) == UsdGeom.Tokens.z)
        if ok:
            op = UsdGeom.Xformable(cam).GetOrderedXformOps()
            nsamples = len(op[0].GetTimeSamples()) if op else 0
            check("camera time-sample count == num_keyframes",
                  nsamples == manifest.get("num_keyframes"),
                  f"samples={nsamples} keyframes={manifest.get('num_keyframes')}")

    _hr("alignment invariants")
    T = align.get("transform", [])
    check("transform is 4x4", len(T) == 4 and all(len(r) == 4 for r in T))
    if len(T) == 4:
        check("transform bottom row == [0,0,0,1]", list(T[3]) == [0, 0, 0, 1], f"got {T[3]}")
    if align.get("metric"):
        check("metric: scale > 0", align.get("scale", 0) > 0)
        check("metric: meters_per_unit == 1.0", align.get("meters_per_unit") == 1.0)
    else:
        check("non-metric export flags up-to-scale in notes",
              "up-to-scale" in manifest.get("notes", ""))
    check("gravity_aligned flag present", "gravity_aligned" in align)

    _hr("summary")
    n = len(_CHECKS)
    passed = sum(_CHECKS)
    print(f"  {passed}/{n} checks PASS")
    sys.exit(0 if passed == n else 1)


if __name__ == "__main__":
    main()
