"""Umeyama Sim(3) / SE(3) trajectory alignment (pure-numpy, evo-consistent).

This vendors the same Umeyama (1991) alignment used by ``slam_bench/metrics.py``
(``_umeyama_np``) so EXP-21 does not pull in the heavyweight ``evo`` dependency but
keeps the numerical convention IDENTICAL:

    umeyama(src, tgt) -> (R, t, s)   minimises  || tgt - (s * R @ src + t) ||

i.e. it maps ``src`` ONTO ``tgt``. For EXP-21's primary metric the estimated EE
trajectory is ``src`` and GT is ``tgt``, so the aligned prediction lands in GT's
frame/scale and the residual is a true position error in GT units.

Conventions (frozen — the primary comparison depends on them):
  * Alignment is computed on the FULL set of provided points (whole-trajectory),
    exactly like ``evo_ape ... -as``. Callers pass only the VALID (non-gap) frames.
  * Sim(3) = with_scale=True (scale-free relative geometry — the H1 primary metric).
    SE(3) = with_scale=False (rigid; used when absolute scale is meaningful).
  * Fewer than 3 points is rejected (Umeyama is ill-posed) — raise, never return a
    bogus identity.
"""

from __future__ import annotations

import numpy as np


class DegenerateAlignmentError(ValueError):
    """Raised when an alignment is ill-posed (< 3 points, or rank-deficient spread)."""


def umeyama(src: np.ndarray, tgt: np.ndarray, with_scale: bool = True
            ) -> "tuple[np.ndarray, np.ndarray, float]":
    """Umeyama alignment mapping ``src`` -> ``tgt``. Returns ``(R (3,3), t (3,), s)``.

    Minimises ``|| tgt - (s * R @ src + t) ||`` (same direction/convention as evo and
    ``slam_bench._umeyama_np``). ``with_scale=False`` forces ``s == 1`` (SE(3)).

    Raises :class:`DegenerateAlignmentError` for < 3 correspondences.
    """
    x = np.asarray(src, dtype=float)
    y = np.asarray(tgt, dtype=float)
    if x.shape != y.shape or x.ndim != 2 or x.shape[1] != 3:
        raise ValueError(f"src/tgt must be matching (N,3); got {x.shape} vs {y.shape}")
    n = x.shape[0]
    if n < 3:
        raise DegenerateAlignmentError(
            f"need >= 3 correspondences for Sim(3)/SE(3) alignment, got {n}")

    xt = x.T  # (3, N)
    yt = y.T
    m = xt.shape[0]
    mean_x = xt.mean(axis=1)
    mean_y = yt.mean(axis=1)
    xc = xt - mean_x[:, None]
    yc = yt - mean_y[:, None]
    sigma_x = float((xc ** 2).sum()) / n
    cov_xy = (yc @ xc.T) / n
    u, d, vt = np.linalg.svd(cov_xy)
    S = np.eye(m)
    if np.linalg.det(u) * np.linalg.det(vt) < 0:
        S[-1, -1] = -1.0
    R = u @ S @ vt
    if with_scale:
        if sigma_x <= 0:
            raise DegenerateAlignmentError(
                "source points are coincident (zero variance); scale is undefined")
        s = float(np.trace(np.diag(d) @ S) / sigma_x)
    else:
        s = 1.0
    t = mean_y - s * R @ mean_x
    return R, t, s


def apply_sim3(points: np.ndarray, R: np.ndarray, t: np.ndarray, s: float) -> np.ndarray:
    """Apply ``s * R @ p + t`` to each row of ``points`` (N,3). The forward map of
    :func:`umeyama` — turns ``src`` points into the ``tgt`` frame."""
    p = np.asarray(points, dtype=float)
    return (s * (R @ p.T)).T + np.asarray(t, dtype=float).reshape(1, 3)


def align_positions(src: np.ndarray, tgt: np.ndarray, mode: str = "sim3") -> np.ndarray:
    """Align ``src`` onto ``tgt`` (``mode`` 'sim3'|'se3') and return the aligned ``src``.

    Convenience wrapper: fits the Umeyama transform on the whole set and applies it.
    """
    if mode not in ("sim3", "se3"):
        raise ValueError(f"mode must be 'sim3' or 'se3', got {mode!r}")
    R, t, s = umeyama(src, tgt, with_scale=(mode == "sim3"))
    return apply_sim3(src, R, t, s)
