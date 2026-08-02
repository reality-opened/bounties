# TUM trajectory file format — spec

This is a from-scratch description of the public **TUM RGB-D benchmark** pose-file
convention (the same convention used by tools like `evo`). It is not tied to any
particular pipeline's internals — treat it as the ground truth for the
`validate` and `diff` subcommands in this bounty.

## File-level grammar

A TUM trajectory file is plain text, one pose per line, in ascending time order.

```
# optional comment line, ignored
<timestamp> <tx> <ty> <tz> <qx> <qy> <qz> <qw>
<timestamp> <tx> <ty> <tz> <qx> <qy> <qz> <qw>
...
```

- **Encoding:** ASCII/UTF-8, `\n` line endings.
- **Comment lines:** any line whose first non-whitespace character is `#` is a
  comment and must be skipped entirely (not counted as a pose, not validated).
- **Blank lines:** lines that are empty or all-whitespace are skipped, same as
  comments.
- **Pose lines:** every other line must tokenize into **exactly 8**
  whitespace-separated fields (single spaces or tabs, any run length). A line
  with fewer or more than 8 tokens is malformed.
- **Field order:** `timestamp tx ty tz qx qy qz qw` — translation before
  rotation, quaternion in **scalar-last** `(x, y, z, w)` order. This is the
  standard TUM ordering; don't silently accept or emit scalar-first `(w,x,y,z)`.

## Field types and ranges

| Field | Type | Notes |
|---|---|---|
| `timestamp` | float | Seconds (or an arbitrary monotonically increasing unit, e.g. frame index cast to float — both appear in the wild). No fixed decimal precision is mandated; parse as a general float (accepts `1.0`, `1`, `1.234567e2`, etc). |
| `tx, ty, tz` | float | Translation, arbitrary but consistent units (meters, typically). |
| `qx, qy, qz, qw` | float | Unit quaternion, scalar-last. |

A conforming **writer** should emit fixed-precision decimals (8 digits after
the point is a common convention and what the fixtures here use), but a
conforming **reader/validator must not** reject other valid float literal
forms (scientific notation, fewer/more decimal digits, a bare integer like
`0` for a zero timestamp) — precision is a writer-side style choice, not a
grammar rule.

## Validation rules

A validator implementing this spec must catch (at minimum) all of the
following corruption classes, and must report the **1-indexed line number(s)**
of every violation it finds (not just the first):

1. **Malformed line** — a non-comment, non-blank line that does not tokenize
   into exactly 8 fields, or where any field fails to parse as a float.
2. **Non-monotonic timestamps** — a pose line whose `timestamp` is strictly
   less than the previous pose line's `timestamp`. (Equal consecutive
   timestamps are a softer issue — flag as a warning, not a hard error, since
   some capture pipelines legitimately emit duplicate timestamps for
   same-tick frames.)
3. **Non-unit quaternion** — `abs(sqrt(qx^2+qy^2+qz^2+qw^2) - 1.0) > 1e-6`.
   This tolerance is deliberately tight: it should catch a raw
   un-normalized quaternion (e.g. straight out of a rotation-matrix-to-quat
   conversion with no renormalization) while still passing quaternions
   that only carry ordinary float32 round-off.
4. **Non-finite values** — any field that parses to `NaN` or `+/-Inf`.
5. **Insufficient pose count** — fewer than 2 pose lines in the file (you
   cannot compute a relative-pose / RPE quantity from a single pose, and a
   0-pose file is almost certainly a pipeline failure, not a valid empty
   trajectory).

## Ordering rule

Pose lines must already be in ascending-`timestamp` order in the file itself —
a validator checks this in a single forward pass; it does not sort the file
for you. A "diff" or "eval" tool that only cares about relative timing between
two trajectories may resample/associate by nearest timestamp, but that is a
separate concern from *file validity*.

## What this spec deliberately leaves open

- Absolute vs. relative scale of `tx,ty,tz` — out of scope for a *format*
  validator; that's a semantic/eval-level question (see `evo`'s `--t_max_diff`,
  alignment/Umeyama options, etc. for cross-trajectory comparison).
- Frame convention (camera-to-world vs. world-to-camera) — not encoded in the
  file itself; must be documented by whatever produced the file.
