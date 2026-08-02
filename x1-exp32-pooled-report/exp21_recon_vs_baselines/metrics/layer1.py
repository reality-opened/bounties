"""Layer-1 geometry metrics — EE/object position + rotation error vs GT.

Primary metric (preregistration §2): per-frame end-effector 3D position error (mm),
median + P95, after ONE Umeyama Sim(3) alignment per episode per arm on the whole
(valid) trajectory. Sim(3) is deliberate — it makes the relative-geometry comparison
fair to scale-ambiguous monocular baselines; all absolute-scale claims live in H2/A".

Gap handling (coverage rule, preregistration §2/§6): an arm's occlusion-gated frames
arrive as NaN rows. Those frames are EXCLUDED from the error stats but COUNTED in the
denominator of ``coverage`` — no arm buys a better median by refusing to answer. The
alignment is fit on valid (both-finite) frames only.

Units: GT positions are metres; errors are reported in **mm** (x1000).
"""

from __future__ import annotations

import numpy as np

from .alignment import umeyama, apply_sim3, DegenerateAlignmentError


def _finite_rows(a: np.ndarray) -> np.ndarray:
    """Boolean mask of rows that are entirely finite (no NaN/Inf gap)."""
    return np.isfinite(a).all(axis=tuple(range(1, a.ndim)))


def _median_p95(values: np.ndarray) -> "tuple[float, float, float]":
    """(median, P95, RMSE) of a 1-D error array. NaN triple for an empty array."""
    v = np.asarray(values, dtype=float)
    if v.size == 0:
        return float("nan"), float("nan"), float("nan")
    return (float(np.median(v)), float(np.percentile(v, 95)),
            float(np.sqrt(np.mean(v ** 2))))


def ee_position_error(pred: np.ndarray, gt: np.ndarray, align: str = "sim3") -> dict:
    """End-effector 3D position error (mm) after one whole-trajectory alignment.

    Parameters
    ----------
    pred : (T,3) float
        Estimated per-frame EE positions; occlusion gaps are NaN rows.
    gt : (T,3) float
        Ground-truth EE positions (metres). GT gaps (NaN rows) are non-answerable.
    align : {'sim3','se3'}
        'sim3' (default, PRIMARY) = scale-free relative geometry; 'se3' = rigid
        (for when absolute scale is meaningful, e.g. an A"/absolute check).

    Returns
    -------
    dict with median_mm, p95_mm, rmse_mm (== ATE RMSE), coverage (n_valid /
    n_answerable), n_valid, n_answerable, n_total, scale (Umeyama s, EST->GT), mode.
    Never raises on a degenerate valid set — returns NaN stats + a ``warning``.
    """
    if align not in ("sim3", "se3"):
        raise ValueError(f"align must be 'sim3' or 'se3', got {align!r}")
    p = np.asarray(pred, dtype=float)
    g = np.asarray(gt, dtype=float)
    if p.shape != g.shape or p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"pred/gt must be matching (T,3); got {p.shape} vs {g.shape}")

    T = p.shape[0]
    gt_ok = _finite_rows(g)                 # frames GT can answer
    both_ok = gt_ok & _finite_rows(p)       # frames the arm actually answered
    n_answerable = int(gt_ok.sum())
    n_valid = int(both_ok.sum())

    out = {
        "median_mm": float("nan"), "p95_mm": float("nan"), "rmse_mm": float("nan"),
        "coverage": (float(n_valid) / n_answerable) if n_answerable else float("nan"),
        "n_valid": n_valid, "n_answerable": n_answerable, "n_total": int(T),
        "scale": float("nan"), "mode": align,
    }
    if n_valid < 3:
        out["warning"] = f"too few valid (both-finite) frames for alignment: {n_valid}"
        return out

    try:
        R, t, s = umeyama(p[both_ok], g[both_ok], with_scale=(align == "sim3"))
    except DegenerateAlignmentError as exc:
        out["warning"] = f"alignment degenerate: {exc}"
        return out

    aligned = apply_sim3(p[both_ok], R, t, s)
    err_m = np.linalg.norm(aligned - g[both_ok], axis=1)  # metres
    err_mm = err_m * 1000.0
    med, p95, rmse = _median_p95(err_mm)
    out.update({"median_mm": med, "p95_mm": p95, "rmse_mm": rmse, "scale": float(s)})
    return out


def _geodesic_deg(Ra: np.ndarray, Rb: np.ndarray) -> float:
    """Geodesic angle (deg) between two rotation matrices via trace of Ra @ Rb.T."""
    R = Ra @ Rb.T
    cos = (np.trace(R) - 1.0) / 2.0
    return float(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))


def rotation_error_deg(pred: np.ndarray, gt: np.ndarray) -> dict:
    """Per-frame EE/object orientation error (deg), median + P95, gap-aware.

    ``pred`` / ``gt`` are (T,3,3) rotation matrices; frames with any non-finite entry
    (gaps) are excluded from the error but counted in ``coverage``. This is the RAW
    per-frame orientation error — if a fixed sensor-to-EE extrinsic offset exists, the
    caller removes it before calling (the offset is METHOD calibration, not a metric).
    """
    p = np.asarray(pred, dtype=float)
    g = np.asarray(gt, dtype=float)
    if p.shape != g.shape or p.ndim != 3 or p.shape[1:] != (3, 3):
        raise ValueError(f"pred/gt must be matching (T,3,3); got {p.shape} vs {g.shape}")

    T = p.shape[0]
    gt_ok = _finite_rows(g)
    both_ok = gt_ok & _finite_rows(p)
    n_answerable = int(gt_ok.sum())
    n_valid = int(both_ok.sum())

    angles = np.array([_geodesic_deg(p[i], g[i]) for i in range(T) if both_ok[i]],
                      dtype=float)
    med, p95, _ = _median_p95(angles)
    return {
        "median_deg": med, "p95_deg": p95,
        "coverage": (float(n_valid) / n_answerable) if n_answerable else float("nan"),
        "n_valid": n_valid, "n_answerable": n_answerable, "n_total": int(T),
    }


# --------------------------------------------------------------------------- #
# ATE / RPE wrappers (secondary, preregistration §6). Thin, position-only.     #
# --------------------------------------------------------------------------- #
def ate(pred: np.ndarray, gt: np.ndarray, align: str = "sim3") -> dict:
    """Absolute Trajectory Error on EE positions = :func:`ee_position_error` re-labelled.

    ATE RMSE (mm) is ``rmse_mm``; median/P95 are also returned for tail reporting.
    """
    res = ee_position_error(pred, gt, align=align)
    return {"ate_rmse_mm": res["rmse_mm"], "median_mm": res["median_mm"],
            "p95_mm": res["p95_mm"], "coverage": res["coverage"],
            "n_valid": res["n_valid"], "scale": res["scale"],
            **({"warning": res["warning"]} if "warning" in res else {})}


def rpe_translation(pred: np.ndarray, gt: np.ndarray, delta: int = 1,
                    align: str = "sim3") -> dict:
    """Relative Pose Error (translation, mm) over a frame ``delta``.

    For each pair (i, i+delta) where both endpoints are valid in pred AND gt, compares
    the pred displacement to the GT displacement after a single whole-trajectory Sim(3)
    scale alignment (so a correct up-to-scale path scores ~0). Returns median/P95 mm +
    n_pairs. Secondary metric.
    """
    if delta < 1:
        raise ValueError(f"delta must be >= 1, got {delta}")
    p = np.asarray(pred, dtype=float)
    g = np.asarray(gt, dtype=float)
    if p.shape != g.shape or p.ndim != 2 or p.shape[1] != 3:
        raise ValueError(f"pred/gt must be matching (T,3); got {p.shape} vs {g.shape}")

    both_ok = _finite_rows(p) & _finite_rows(g)
    out = {"median_mm": float("nan"), "p95_mm": float("nan"), "n_pairs": 0,
           "delta": int(delta), "mode": align}
    if int(both_ok.sum()) < 3:
        out["warning"] = "too few valid frames to scale-align RPE"
        return out

    try:
        R, t, s = umeyama(p[both_ok], g[both_ok], with_scale=(align == "sim3"))
    except DegenerateAlignmentError as exc:
        out["warning"] = f"alignment degenerate: {exc}"
        return out
    p_al = apply_sim3(p, R, t, s)

    errs = []
    T = p.shape[0]
    for i in range(T - delta):
        j = i + delta
        if both_ok[i] and both_ok[j]:
            d_pred = p_al[j] - p_al[i]
            d_gt = g[j] - g[i]
            errs.append(np.linalg.norm(d_pred - d_gt) * 1000.0)
    if not errs:
        out["warning"] = "no valid relative pairs at this delta"
        return out
    med, p95, _ = _median_p95(np.asarray(errs))
    out.update({"median_mm": med, "p95_mm": p95, "n_pairs": len(errs)})
    return out
