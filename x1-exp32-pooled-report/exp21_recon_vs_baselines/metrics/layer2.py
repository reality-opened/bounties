"""Layer-2 data-quality metrics — action jerk, static-object spread, occlusion strata.

Preregistration §6 (L2). These measure whether the recovered trajectory is *usable
training data*, not just close to GT:

  * action_jerk    — action-space smoothness on a LeRobot-converted EE track. Noisy
                     lifts show up as high third-difference jerk even when median
                     position error looks fine. Report median + P95 magnitude.
  * static_spread  — EXP-15 §4 machinery: a truly static object should reconstruct to
                     ~one world point; the RMS spread of its per-frame world positions
                     is the temporal-consistency signal (should be ~0).
  * occlusion_strata — the money figure: bin per-frame error by occlusion fraction
                     (D6 estimator, computed upstream) and report the divergence curve.

Pure-numpy, CPU-only. Gap-aware throughout (NaN rows are dropped from stats).
"""

from __future__ import annotations

import numpy as np


def _finite_rows(a: np.ndarray) -> np.ndarray:
    return np.isfinite(a).all(axis=tuple(range(1, a.ndim)))


def action_jerk(positions: np.ndarray, fps: float) -> dict:
    """Action-space jerk from the third finite difference of EE positions.

    Uniform sampling at ``fps`` (dt = 1/fps). The third forward difference
    ``x[i+3] - 3x[i+2] + 3x[i+1] - x[i]`` divided by ``dt**3`` approximates the jerk
    (third time derivative); it is EXACT for a locally-cubic path. Only windows whose
    four points are all finite contribute. Returns median/P95 of the per-sample jerk
    magnitude (m/s^3) + n windows.
    """
    x = np.asarray(positions, dtype=float)
    if x.ndim != 2 or x.shape[1] != 3:
        raise ValueError(f"positions must be (T,3); got {x.shape}")
    if fps <= 0:
        raise ValueError(f"fps must be > 0, got {fps}")
    dt = 1.0 / float(fps)

    T = x.shape[0]
    ok = _finite_rows(x)
    mags = []
    for i in range(T - 3):
        if ok[i] and ok[i + 1] and ok[i + 2] and ok[i + 3]:
            d3 = x[i + 3] - 3.0 * x[i + 2] + 3.0 * x[i + 1] - x[i]
            mags.append(np.linalg.norm(d3) / (dt ** 3))
    if not mags:
        return {"median": float("nan"), "p95": float("nan"), "n": 0,
                "unit": "m/s^3", "fps": float(fps)}
    m = np.asarray(mags, dtype=float)
    return {"median": float(np.median(m)), "p95": float(np.percentile(m, 95)),
            "n": int(m.size), "unit": "m/s^3", "fps": float(fps)}


def action_jerk_magnitudes(positions: np.ndarray, fps: float) -> np.ndarray:
    """Raw per-window jerk magnitudes (m/s^3) — the primitive behind :func:`action_jerk`.

    Identical third-forward-difference and gap rule as :func:`action_jerk` (a window
    contributes iff all four of its frames are finite). Returned as a flat ``(M,)`` array
    so a caller can build a genuine POOLED tail statistic (a real pooled P95 across many
    episodes) instead of a P95-of-P95s. Empty array when no full 4-frame window exists.
    """
    x = np.asarray(positions, dtype=float)
    if x.ndim != 2 or x.shape[1] != 3:
        raise ValueError(f"positions must be (T,3); got {x.shape}")
    if fps <= 0:
        raise ValueError(f"fps must be > 0, got {fps}")
    dt = 1.0 / float(fps)
    ok = _finite_rows(x)
    T = x.shape[0]
    mags = []
    for i in range(T - 3):
        if ok[i] and ok[i + 1] and ok[i + 2] and ok[i + 3]:
            d3 = x[i + 3] - 3.0 * x[i + 2] + 3.0 * x[i + 1] - x[i]
            mags.append(np.linalg.norm(d3) / (dt ** 3))
    return np.asarray(mags, dtype=float)


def velocity_noise_magnitudes(positions: np.ndarray, fps: float) -> np.ndarray:
    """Raw per-window second-difference (acceleration) magnitudes (m/s^2).

    ``x[i+2] - 2 x[i+1] + x[i]`` divided by ``dt**2`` is the discrete second derivative:
    it is EXACTLY zero for a constant-velocity path, so its RMS is a direct velocity-noise
    signal (jitter in the recovered velocity shows up as acceleration energy). Gap-aware —
    a window contributes iff its three frames are all finite, so only whole valid runs
    count and no acceleration is ever fabricated across a gap. Empty array if no window.
    """
    x = np.asarray(positions, dtype=float)
    if x.ndim != 2 or x.shape[1] != 3:
        raise ValueError(f"positions must be (T,3); got {x.shape}")
    if fps <= 0:
        raise ValueError(f"fps must be > 0, got {fps}")
    dt = 1.0 / float(fps)
    ok = _finite_rows(x)
    T = x.shape[0]
    mags = []
    for i in range(T - 2):
        if ok[i] and ok[i + 1] and ok[i + 2]:
            d2 = x[i + 2] - 2.0 * x[i + 1] + x[i]
            mags.append(np.linalg.norm(d2) / (dt ** 2))
    return np.asarray(mags, dtype=float)


def velocity_noise(positions: np.ndarray, fps: float) -> dict:
    """Velocity-noise = RMS of the second-difference (acceleration) magnitudes (§6 L2).

    Reports ``rms`` (the headline number), plus ``median`` + ``p95`` magnitude and the
    window count ``n``, in m/s^2. Uniform sampling at ``fps`` (dt = 1/fps). Computed on
    valid runs only (gap-aware, via :func:`velocity_noise_magnitudes`). Returns NaN stats
    if no full 3-frame window exists.
    """
    m = velocity_noise_magnitudes(positions, fps)
    if m.size == 0:
        return {"rms": float("nan"), "median": float("nan"), "p95": float("nan"),
                "n": 0, "unit": "m/s^2", "fps": float(fps)}
    return {"rms": float(np.sqrt(np.mean(m ** 2))),
            "median": float(np.median(m)), "p95": float(np.percentile(m, 95)),
            "n": int(m.size), "unit": "m/s^2", "fps": float(fps)}


def static_spread(world_points_per_frame: np.ndarray) -> dict:
    """RMS world-position spread of a STATIC object across frames (EXP-15 §4).

    Input is the object's per-frame reconstructed world position, (T,3), with NaN rows
    on gap frames. Returns RMS distance from the centroid (the temporal-consistency
    number — should be ~0 for a static object), plus max excursion, bbox diagonal, and
    the centroid. NaN stats if fewer than 2 valid frames.
    """
    pts = np.asarray(world_points_per_frame, dtype=float)
    if pts.ndim != 2 or pts.shape[1] != 3:
        raise ValueError(f"world_points_per_frame must be (T,3); got {pts.shape}")
    valid = pts[_finite_rows(pts)]
    if valid.shape[0] < 2:
        return {"n": int(valid.shape[0]), "rms": float("nan"),
                "max_excursion": float("nan"), "bbox_diag": float("nan"),
                "centroid": [float("nan")] * 3}
    c = valid.mean(axis=0)
    dists = np.linalg.norm(valid - c, axis=1)
    return {"n": int(valid.shape[0]),
            "rms": float(np.sqrt(np.mean(dists ** 2))),
            "max_excursion": float(dists.max()),
            "bbox_diag": float(np.linalg.norm(valid.max(axis=0) - valid.min(axis=0))),
            "centroid": c.tolist()}


def occlusion_strata(errors: np.ndarray, occlusion_fractions: np.ndarray,
                     bins: "list[float]") -> dict:
    """Occlusion-stratified error curve: per-bin median / P95 / count.

    ``errors`` (N,) per-frame error (any unit), ``occlusion_fractions`` (N,) in [0,1]
    (the D6 estimator, frozen upstream), ``bins`` monotonically increasing edges, e.g.
    ``[0, 0.25, 0.5, 0.75, 1.0]`` -> 4 strata. A frame lands in bin k iff
    ``bins[k] <= f < bins[k+1]`` (the last bin is closed on the right so f == 1.0 is
    included). Frames with non-finite error or occlusion are dropped. Returns
    ``{"bins": [ {bin_lo, bin_hi, median, p95, count}, ... ]}``.
    """
    e = np.asarray(errors, dtype=float).reshape(-1)
    f = np.asarray(occlusion_fractions, dtype=float).reshape(-1)
    if e.shape != f.shape:
        raise ValueError(f"errors and occlusion_fractions must match; {e.shape} vs {f.shape}")
    edges = np.asarray(bins, dtype=float)
    if edges.ndim != 1 or edges.size < 2 or np.any(np.diff(edges) <= 0):
        raise ValueError("bins must be >= 2 strictly-increasing edges")

    keep = np.isfinite(e) & np.isfinite(f)
    e, f = e[keep], f[keep]

    strata = []
    n_bins = edges.size - 1
    for k in range(n_bins):
        lo, hi = float(edges[k]), float(edges[k + 1])
        if k == n_bins - 1:  # last bin closed on the right so f == hi is included
            sel = (f >= lo) & (f <= hi)
        else:
            sel = (f >= lo) & (f < hi)
        vals = e[sel]
        if vals.size:
            strata.append({"bin_lo": lo, "bin_hi": hi,
                           "median": float(np.median(vals)),
                           "p95": float(np.percentile(vals, 95)),
                           "count": int(vals.size)})
        else:
            strata.append({"bin_lo": lo, "bin_hi": hi, "median": float("nan"),
                           "p95": float("nan"), "count": 0})
    return {"bins": strata}
