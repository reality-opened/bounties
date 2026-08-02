# Gaussian-splat PLY format — spec

This is a standalone description of the binary vertex layout used by
"3D Gaussian Splatting" (3DGS) `.ply` files — the de-facto interchange format
most 3DGS viewers and tools expect. It does not assume you have access to any
particular pipeline's source; treat it as the ground truth for building both
a sample generator and a validating inspector.

## Container

- The file is a standard [PLY](http://paulbourke.net/dataformats/ply/) file
  with `format binary_little_endian 1.0` in its header. There is no ASCII
  variant for this schema — a splat file is always binary.
- The header declares a single element, `vertex`, with a count:
  `element vertex <N>`, followed by exactly 17 `property float <name>` lines,
  then `end_header\n`. Everything after that byte offset is raw binary data:
  `N` fixed-size records, back to back, no padding between records or fields.
- Each record is `17 * 4 = 68` bytes (17 IEEE-754 single-precision floats,
  little-endian). Total data-section size must equal `N * 68` bytes exactly;
  anything else means the file is truncated, over-long, or the header's `N`
  is wrong.

## The 17 fields, in canonical order

The field **order is part of the contract**, not just the names — most
viewers decode a record positionally (offset 0 is always `x`, offset 4 is
always `y`, ...), so a file whose header lists the right 17 names but in a
different order is still a broken file for most consumers, even though it is
technically well-formed PLY. The canonical order is:

```
x, y, z,
nx, ny, nz,
f_dc_0, f_dc_1, f_dc_2,
opacity,
scale_0, scale_1, scale_2,
rot_0, rot_1, rot_2, rot_3
```

| # | Field(s) | Meaning |
|---|---|---|
| 1-3 | `x, y, z` | Gaussian center, in whatever world/scene coordinate frame the reconstruction used. |
| 4-6 | `nx, ny, nz` | Surface normal. Splat renderers do not use this for anything — it exists only because the schema historically inherited it from plain colored-point-cloud PLYs. A baseline (non-oriented) exporter writes `0, 0, 0` for every vertex. |
| 7-9 | `f_dc_0, f_dc_1, f_dc_2` | Color, encoded as a spherical-harmonics **degree-0 ("DC") coefficient** per RGB channel — not raw RGB. See "Color encoding" below. |
| 10 | `opacity` | The gaussian's alpha (blend weight), stored as its **logit** (inverse sigmoid), not the raw `[0,1]` value. See "Opacity encoding" below. |
| 11-13 | `scale_0, scale_1, scale_2` | Per-axis physical size of the gaussian, stored as a **natural log**, not the raw linear size. See "Scale encoding" below. |
| 14-17 | `rot_0, rot_1, rot_2, rot_3` | Orientation as a **unit quaternion**, in **scalar-first** `(w, x, y, z)` order. See "Rotation encoding" below. |

## Color encoding (`f_dc_0..2`)

A per-channel color `c` normalized to `[0, 1]` is stored as:

```
f_dc = (c - 0.5) / SH_C0
```

where `SH_C0 = 0.28209479177387814` is the normalization constant for the
degree-0 real spherical harmonic (a fixed constant, not something a generator
or reader computes — it comes from the `Y_0^0` term's closed-form
normalization). A reader inverts it with:

```
c = f_dc * SH_C0 + 0.5
```

Because `c ∈ [0, 1]`, every legitimately-encoded `f_dc` value must fall in
`[-0.5 / SH_C0, 0.5 / SH_C0] ≈ [-1.7725, 1.7725]` (plus ordinary float
rounding slack). A value far outside that band is a strong signal that raw
`0-255` or raw `0-1` RGB was written into the field directly, skipping the
SH-DC transform.

## Opacity encoding (`opacity`)

A per-gaussian alpha `a`, conceptually in the open interval `(0, 1)`, is
stored as its logit:

```
opacity = ln(a / (1 - a))
```

A renderer recovers `a` with a sigmoid, `a = 1 / (1 + exp(-opacity))`, at
draw time. Storing the logit rather than `a` directly lets the raw float
range freely over all of `(-inf, inf)` while the recovered alpha always
stays inside `(0, 1)` — useful for anything that optimizes this value with
unconstrained gradient steps. A minimal, non-optimized ("baseline")
exporter typically just picks one fixed alpha (e.g. `0.9`) and writes the
same logit for every gaussian in the file.

## Scale encoding (`scale_0, scale_1, scale_2`)

A per-axis linear size `s` (a positive length, in the same units as
`x, y, z`) is stored as:

```
scale = ln(s)
```

recovered by a renderer as `s = exp(scale)`. As with opacity, this keeps the
stored float unconstrained while guaranteeing the recovered size is
positive. A non-oriented ("isotropic") baseline exporter typically derives a
single scalar size per point (e.g. from local point spacing) and writes the
same log-value into all three axes for that gaussian, rather than fitting an
anisotropic ellipsoid.

### Scale-tail clamping (informational, not part of the wire format)

Some exporters clamp each axis's scale down to a high percentile (e.g. the
99th) of that file's own scale distribution before taking the log, so that a
handful of degenerate/outlier points (e.g. an isolated point with no close
neighbours, producing a huge estimated spacing) don't produce enormous
gaussians that dominate a render. This is purely a producer-side choice —
nothing in the file format records whether it happened — but it means a
*healthy* file's scale distribution should generally not have a long,
sparse tail reaching many multiples of its own 99th percentile. A large,
sparsely-populated tail above the p99 mark is worth surfacing as a
diagnostic even on an otherwise well-formed file, since it's the signature
either of an unclamped export or of genuinely bad geometry.

## Rotation encoding (`rot_0, rot_1, rot_2, rot_3`)

A unit quaternion representing the gaussian's orientation, in
**scalar-first** order: `rot_0 = w`, `rot_1 = x`, `rot_2 = y`, `rot_3 = z`.
This is the opposite component order from the scalar-last `(x, y, z, w)`
convention used by TUM-style pose files elsewhere in this ecosystem — don't
transpose the two by accident when working across both formats.

By definition, `rot_0^2 + rot_1^2 + rot_2^2 + rot_3^2` must equal `1` (up to
float rounding). A gaussian with no preferred orientation — the case for any
isotropic baseline exporter, since all three scale axes are equal and
orientation is meaningless — is written as the **identity quaternion**,
`(w, x, y, z) = (1, 0, 0, 0)`. A file where every single vertex carries
exactly this identity rotation is a normal and expected shape for a
baseline-quality export, not itself a defect.

## Summary: minimal validity checklist

A conforming file must have, at minimum:

1. `format binary_little_endian 1.0`.
2. Exactly 17 `property float` header lines, in the canonical name-and-order
   list above.
3. A data section exactly `N * 68` bytes long, where `N` is the header's
   declared `element vertex` count.
4. Every one of the `17 * N` floats finite (no `NaN` / `Inf`).
5. Every `f_dc_*` inside (approximately) `[-1.7725, 1.7725]`.
6. Every `rot_0..3` group a unit quaternion within a reasonable tolerance
   (float32 log/exp/logit round-tripping means this shouldn't be as tight as
   a pose file's tolerance — `1e-3` is a reasonable working bound).
