# Synthetic scene artifact schemas

This is a standalone, from-scratch specification of four on-disk artifact
formats a monocular-SLAM-style reconstruction pipeline can produce for one
"scene" (a sequence of posed camera frames plus reconstructed geometry). It is
written to be implemented against directly — you should not need to read any
other source to build a generator or a checker from this document.

All four formats below describe **the same underlying scene** when produced
together: the same number of frames, geometry in the same world coordinate
frame, and (for the merged/splat formats) points drawn from the same
per-frame point clouds.

---

## 1. TUM pose file (`.txt`)

Plain-text camera trajectory, one pose per line, in ascending time order.

```
# optional comment line, ignored by readers
<timestamp> <tx> <ty> <tz> <qx> <qy> <qz> <qw>
```

- 8 whitespace-separated float fields per pose line.
- `timestamp`: float, non-decreasing across the file (this is the frame's
  time or index, cast to float).
- `tx, ty, tz`: translation of the camera center in world coordinates
  (arbitrary consistent unit, e.g. meters).
- `qx, qy, qz, qw`: unit quaternion (scalar-last order), camera-to-world
  rotation. `sqrt(qx^2+qy^2+qz^2+qw^2)` must equal `1.0` within `1e-6`.
- Lines starting with `#`, and blank lines, are comments and must be skipped
  by readers.
- All fields must be finite (no `NaN`/`Inf`).
- One line per frame; the number of pose lines is the scene's frame count.

## 2. Per-frame point-cloud/mask NPZ (`.npz`, one file per frame)

Each frame gets its own NumPy `.npz` archive (`np.savez(path, **arrays)`)
holding the frame's raw structured geometry (before any merging into a single
cloud), keyed by exactly these two array names:

| Key | dtype | Shape | Meaning |
|---|---|---|---|
| `pointcloud` | `float32` | `(H, W, 3)` | Per-pixel world-frame `(x, y, z)` position. Row/col order matches the source image's pixel grid; last axis is `(x, y, z)`. |
| `mask` | `bool` | `(H, W)` | Per-pixel validity flag. `True` = this pixel's 3D point is valid/confident and should be included in any merged cloud; `False` = filtered out (e.g. low confidence, missing depth). |

Rules:
- `mask.shape == pointcloud.shape[:2]` exactly (same `H, W`).
- Wherever `mask[i, j]` is `True`, `pointcloud[i, j, :]` must be all-finite.
  Wherever `mask[i, j]` is `False`, the corresponding `pointcloud` values are
  **not** constrained (a producer may leave garbage/NaN there — a consumer
  must never read geometry through a `False` mask entry).
- `H, W` must be identical across every frame's NPZ within one scene (so
  frames can be stacked/compared).
- File naming is a generator's own choice, but must be consistent and sortable
  within a scene (e.g. zero-padded frame index: `0000.npz`, `0001.npz`, ...).
  Whatever convention is used, it should let a consumer recover per-frame
  ordering without needing to open every file.

## 3. Merged colored point-cloud PLY (`.ply`)

A single PLY file holding every frame's valid (`mask == True`) points,
concatenated into one cloud in the shared world frame, with per-point color.

```
ply
format ascii 1.0            (or: format binary_little_endian 1.0)
element vertex <N>
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
<N rows of data>
```

- Exactly 6 vertex properties, in this order: `x, y, z` (each `float`, world
  coordinates, matching the units in the NPZ/TUM files for the same scene),
  then `red, green, blue` (each `uchar`, `0-255`).
- Either `format ascii 1.0` or `format binary_little_endian 1.0` is
  acceptable; `format binary_big_endian 1.0` is not (this pipeline never
  produces big-endian output).
  - ASCII body: one line per vertex, 6 whitespace-separated values
    (`x y z r g b`), floats in ordinary decimal notation, `r/g/b` as integers
    `0-255`.
  - Binary body: `N` tightly-packed records, each `3×float32 + 3×uint8`
    (15 bytes/vertex), no padding, immediately after `end_header\n`.
- `N` (the declared `element vertex` count) must equal the actual number of
  data rows/records, and should equal the total count of `True` entries
  across every frame's `mask` in the scene (this is what makes the format
  "merged" rather than an arbitrary independent cloud).
- All `x, y, z` values must be finite.

## 4. 3D Gaussian Splat PLY (`.ply`, binary only)

A binary PLY encoding one Gaussian per (typically: per merged-cloud) point,
in the de-facto 3DGS vertex layout. This format is **always binary**
(`format binary_little_endian 1.0`) — there is no ASCII splat variant in this
pipeline.

```
ply
format binary_little_endian 1.0
element vertex <N>
property float x
property float y
property float z
property float nx
property float ny
property float nz
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
<N tightly-packed records, 17 * float32 (little-endian) each, no padding>
```

The 17 properties **must appear in exactly this order** — this is the
de-facto convention most 3DGS viewers hardcode positionally, not by property
name lookup. Semantics of each field:

| Field(s) | Meaning |
|---|---|
| `x, y, z` | Gaussian center, world coordinates (same frame/units as the merged PLY above). |
| `nx, ny, nz` | Normal. 3DGS renderers ignore this; a generator should emit `0, 0, 0` (present only for schema compatibility with tools that expect the property to exist). |
| `f_dc_0, f_dc_1, f_dc_2` | Spherical-harmonics **degree-0 (DC)** term per RGB channel — this is the color, but not stored as raw RGB. Given a per-channel color `c` normalized to `[0, 1]`: `f_dc = (c - 0.5) / SH_C0`, where `SH_C0 = 0.28209479177387814` (the degree-0 real solid-harmonic normalization constant). A viewer/consumer inverts it as `c = f_dc * SH_C0 + 0.5`. |
| `opacity` | The per-gaussian alpha `a` (in `(0, 1)`), stored as its **logit** (inverse sigmoid): `opacity = ln(a / (1 - a))`. A renderer applies `sigmoid` at draw time to recover `a`. |
| `scale_0, scale_1, scale_2` | Per-axis Gaussian scale (a positive linear size), stored as its **natural log**: `scale_i = ln(size_i)`. A renderer applies `exp` to recover the linear size. Storing the log lets the raw float freely range over all reals while the recovered size stays positive. |
| `rot_0, rot_1, rot_2, rot_3` | Unit quaternion, **scalar-first** `(w, x, y, z)` order (note: this is the opposite field order from the TUM pose file above, which is scalar-last — don't transpose the two conventions by accident). An isotropic Gaussian with no preferred orientation uses the identity rotation `(1, 0, 0, 0)`. |

Additional rules:
- `N` (declared vertex count) must equal the actual number of 17-float32
  records in the data section (`data_bytes == N * 17 * 4`).
- Every field must be finite.
- `f_dc_0..2` must be consistent with a source color in `[0, 1]`, i.e. each
  should fall within `[-0.5/SH_C0, 0.5/SH_C0]` (~`[-1.7725, 1.7725]`) up to a
  small floating-point margin — a value wildly outside that range almost
  always means raw `[0,255]` or `[0,1]` RGB was written directly instead of
  being converted to the SH-DC encoding.
- `rot_0..3` must be a unit quaternion within a reasonable tolerance (this
  spec uses `1e-3`, looser than the TUM pose tolerance, since these values
  round-trip through `log`/`exp`/`logit` math as float32 and accumulate more
  error than a pose file that's just copied through).

### Cross-format consistency (when generating one scene)

- TUM pose-file line count == number of per-frame NPZ files == frame count.
- Merged PLY vertex count == sum over frames of `mask.sum()` for that frame's
  NPZ.
- Splat PLY vertex count == merged PLY vertex count (one Gaussian seeded per
  merged point is the simplest valid construction, though it isn't the only
  one — the requirement here is just that it's *documented and consistent*,
  not that a generator must use exactly one Gaussian per input point).
