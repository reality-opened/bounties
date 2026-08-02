# vendor/ — read-only, not the bounty deliverable

This directory is a **trimmed, read-only copy** of the production Isaac export code
(`server/export/isaac/*`, plus the `server/export/` modules it imports) and the duck-typed
test fakes (`tests/export_fakes.py`), plus a standalone extract of `decompose_camera`
(normally `vggt_slam.slam_utils`, from the `core` repo). It exists for one reason: so
`scripts/make_isaac_fixture.py` can run the **real** Isaac exporter and produce a **real**
`scene.usd`/`trajectory.usd`/`manifest.json` tree, without you needing a checkout of the
private `server`/`core` repos.

Do not build the validator in here, and do not treat this as the spec — `docs/isaac-export.md`
is the spec, `reference/inspect_isaac.py` is the (to-be-superseded) reference checker. This
code is copied verbatim from the internal repo except:

- `vggt_slam/slam_utils.py` only carries `decompose_camera` (the rest of that module needs
  `torch`/`torchvision`, which this kit doesn't need).
- `server/scene_report/__init__.py` is trimmed to just the schemas (only needed transitively
  by `server/export/dynamics.py`'s `ObjectTrack` import; the fixture never exercises the
  dynamics sidecar or the scene-report subsystem itself).
- `server/export/{video,grounding,dynamics,writer}.py` are carried over only because
  `server/export/isaac/writer.py` opportunistically imports `server.export.writer._first_frame_hw`
  for the camera-aperture metadata (wrapped in a `try/except` upstream — harmless if absent,
  included here for fidelity).

Dependencies to run it: `numpy`, `scipy`, `pydantic`, `usd-core` (hard requirement — no
fallback for a missing USD writer), `open3d` (optional — mesh/collider reconstruction; without
it the export still succeeds as a points-only scene, see `docs/isaac-export.md` §1/§5). No GPU,
no torch, no network.

**System note:** `open3d` wheels dynamically link `libgomp` (the GNU OpenMP runtime). If
`import open3d` fails with `libgomp.so.1: cannot open shared object file`, install your
distro's OpenMP runtime package (Debian/Ubuntu: `libgomp1`) — this is a normal `open3d` system
dependency, not something specific to this kit.
