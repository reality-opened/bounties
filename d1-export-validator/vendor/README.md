# vendor/ — read-only, not the bounty deliverable

This directory is a **trimmed, read-only copy** of the production export code
(`server/export/*`, `server/scene_report/schemas.py`) plus a standalone extract of
`decompose_camera` (normally `vggt_slam.slam_utils`, from the `core` repo). It exists for one
reason: so `scripts/make_local_export_fixture.py` can run the **real** export pipeline and
produce a **real** OpenReality / GR00T-LeRobot tree, without you needing a checkout of the
private `server`/`core` repos.

Do not build the validator in here, and do not treat this as the spec — `docs/dataset-export.md`
is the spec, `reference/inspect_export.py` is the (to-be-superseded) reference checker. This
code is copied verbatim from the internal repo except:

- `vggt_slam/slam_utils.py` only carries `decompose_camera` (the rest of that module needs
  `torch`/`torchvision`, which this kit doesn't need).
- `server/scene_report/__init__.py` is trimmed to just the schemas (the real package also
  pulls in an LLM-backed report builder, reverse-image search, and a Modal-backed store — none
  of which the export path needs).
- `server/export/writer.py`'s module-level import of `server.export.dynamics` is satisfied
  (the dynamics sidecar is never invoked here — `make_local_export_fixture.py` passes no
  `object_tracks`), so the static export tree this kit produces is unaffected.

Dependencies to run it: `numpy`, `scipy`, `pandas`, `pyarrow`, `opencv-python-headless`,
`pydantic`. No GPU, no torch, no network.
