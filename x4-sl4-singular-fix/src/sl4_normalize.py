"""SL(4) homography normalization — extracted verbatim from
``vggt_slam/slam_utils.py`` (the `core` SLAM library) for this bounty.

Only the one function is pulled in: it has no dependency beyond numpy (no
other project helper, no scipy, no torch). The rest of ``slam_utils.py`` is
unrelated image/embedding plumbing and is intentionally not part of this kit.

## Why this function exists

The SLAM pose graph represents each camera pose as a 4x4 homography that must
live in SL(4) — the group of 4x4 real matrices with determinant exactly 1.
Homographies arrive from upstream estimation with some arbitrary positive
scale baked in (H and c*H describe the same projective transform for any
c > 0), so before a homography can be inserted as a graph node it has to be
rescaled to unit determinant. That rescale is all this function does.

## Context: EXP-36 and the china_office crash

An internal SLAM evaluation sweep (EXP-36) hit a real production failure: on
one public 8112-frame robot recording, SL(4) graph insertion crashed with a
native "SL4 Constructor: input matrix singular" error, in every configuration
tested. The proximate cause is a homography reaching the graph library whose
determinant is non-positive or has collapsed to (numerically) zero.

This function already guards the two silent-failure modes that predate it
(see the docstring below: a negative determinant used to yield an all-NaN
matrix with no exception at all, and an exactly-zero-tested determinant let
values like ``1e-300`` through to a ~1e75 blowup). What it does *not* yet do
is offer any way to keep a long batch job alive when it hits input it cannot
salvage: today it raises on exactly the class of input the china_office
recording produced. See ``tests/test_crash.py`` for the behavior this bounty
is asking you to add on top of what's here.
"""
import numpy as np


def normalize_to_sl4(H, det_tol=1e-12):
    """
    Normalize a 4x4 homography matrix H to be in SL(4), i.e. scale it so det == 1.

    Raises ValueError when that is impossible or numerically meaningless:

    * **det < 0** — no real scaling can fix it. H/s has det(H)/s**4, and s**4 > 0 for every
      real s, so a negative determinant can never be carried to +1. Previously
      ``det ** (1/4)`` on a negative numpy float returned NaN, so the caller got an
      all-NaN matrix and no error at all.
    * **|det| ~ 0** — the old check was exact equality (``det == 0``), which let
      det = 1e-300 sail through and produce a ~1e75 blow-up. The determinant is measured
      RELATIVE to the matrix scale (det of H/max|H|), so this flags genuinely singular
      matrices without false-positiving on a uniformly small-magnitude H. That relative
      form is exact here: the returned value is invariant to rescaling H.
    """
    H = np.asarray(H, dtype=float)
    scale_ref = np.max(np.abs(H))
    if not np.isfinite(scale_ref) or scale_ref == 0.0:
        raise ValueError("Homography matrix is all-zero or non-finite and cannot be normalized.")

    H_unit = H / scale_ref
    det = np.linalg.det(H_unit)
    if det < 0:
        raise ValueError(
            f"Homography has negative determinant (relative det = {det:.3e}); a real 4x4 "
            "matrix with det < 0 cannot be scaled into SL(4), since any real scaling "
            "multiplies the determinant by a positive s**4. The matrix is orientation-"
            "reversing — fix its construction rather than normalizing it."
        )
    if abs(det) < det_tol:
        raise ValueError(
            f"Homography matrix is singular to working precision (relative det = {det:.3e}, "
            f"tolerance {det_tol:.1e}) and cannot be normalized; scaling it into SL(4) "
            "would amplify it by ~1/det**(1/4)."
        )

    return H_unit / (det ** 0.25)
