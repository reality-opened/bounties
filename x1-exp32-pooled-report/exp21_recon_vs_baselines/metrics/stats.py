"""Paired statistical analysis (preregistration §7 — frozen plan).

Paired per-episode differences on identical episodes (arm A vs arm B on the same
input). We report EFFECT SIZE + CIs, not just a p-value:

  * Wilcoxon signed-rank test on the paired differences (scipy).
  * Bootstrap 95% CI on the MEDIAN paired difference (fixed seed -> reproducible).
  * Hodges-Lehmann estimate (median of Walsh averages) — a robust location estimate
    of the paired shift, the effect-size headline.

Convention: ``diff = a - b`` (e.g. A_error - B_error). A NEGATIVE median/HL means ``a``
has the smaller error (A wins). Pairs with a non-finite value in either arm are dropped
(and counted) before any statistic is computed.

Pure numpy + scipy.stats, CPU-only.
"""

from __future__ import annotations

import numpy as np
from scipy import stats as _sps


def _clean_pairs(a: np.ndarray, b: np.ndarray) -> "tuple[np.ndarray, np.ndarray, int]":
    """Return matched (a, b) with any non-finite pair dropped, plus n_dropped."""
    a = np.asarray(a, dtype=float).reshape(-1)
    b = np.asarray(b, dtype=float).reshape(-1)
    if a.shape != b.shape:
        raise ValueError(f"paired arrays must match; got {a.shape} vs {b.shape}")
    keep = np.isfinite(a) & np.isfinite(b)
    return a[keep], b[keep], int((~keep).sum())


def hodges_lehmann(diffs: np.ndarray) -> float:
    """One-sample Hodges-Lehmann estimate: median of all Walsh averages of ``diffs``.

    Walsh averages are ``(d_i + d_j)/2`` for all ``i <= j`` (diagonal included). This
    is the robust location estimate paired with the Wilcoxon signed-rank test.
    """
    d = np.asarray(diffs, dtype=float).reshape(-1)
    d = d[np.isfinite(d)]
    if d.size == 0:
        return float("nan")
    W = (d[:, None] + d[None, :]) / 2.0
    iu = np.triu_indices(d.size, k=0)          # i <= j (include diagonal)
    return float(np.median(W[iu]))


def bootstrap_median_diff_ci(diffs: np.ndarray, n_boot: int = 10000, seed: int = 0,
                             alpha: float = 0.05) -> dict:
    """Percentile bootstrap CI on the median of the paired differences (fixed seed).

    Resamples ``diffs`` with replacement ``n_boot`` times (seeded RNG -> reproducible),
    takes the median of each resample, and returns the ``[alpha/2, 1-alpha/2]``
    percentile interval around the observed median difference.
    """
    d = np.asarray(diffs, dtype=float).reshape(-1)
    d = d[np.isfinite(d)]
    n = d.size
    out = {"median_diff": float("nan"), "ci_lo": float("nan"), "ci_hi": float("nan"),
           "alpha": float(alpha), "n_boot": int(n_boot), "n": int(n), "seed": int(seed)}
    if n == 0:
        return out
    out["median_diff"] = float(np.median(d))
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, n, size=(int(n_boot), n))
    boot_medians = np.median(d[idx], axis=1)
    out["ci_lo"] = float(np.percentile(boot_medians, 100.0 * (alpha / 2.0)))
    out["ci_hi"] = float(np.percentile(boot_medians, 100.0 * (1.0 - alpha / 2.0)))
    return out


def wilcoxon_signed_rank(a: np.ndarray, b: np.ndarray) -> dict:
    """Wilcoxon signed-rank test on paired ``a`` vs ``b`` (diff = a - b).

    Returns statistic, pvalue, n (usable pairs), n_dropped, and n_zero (tied pairs).
    Degenerate cases (no usable pairs, or all differences zero) return NaN stats with
    a ``warning`` instead of raising.
    """
    a, b, n_dropped = _clean_pairs(a, b)
    diffs = a - b
    n_zero = int((diffs == 0).sum())
    out = {"statistic": float("nan"), "pvalue": float("nan"), "n": int(a.size),
           "n_dropped": n_dropped, "n_zero": n_zero}
    if a.size == 0:
        out["warning"] = "no usable pairs"
        return out
    if np.all(diffs == 0):
        out["warning"] = "all paired differences are zero; test undefined"
        return out
    # zero_method='wilcox' (scipy default) discards exact zeros, matching the classic test.
    res = _sps.wilcoxon(a, b)
    out["statistic"] = float(res.statistic)
    out["pvalue"] = float(res.pvalue)
    return out


def paired_analysis(a: np.ndarray, b: np.ndarray, *, n_boot: int = 10000,
                    seed: int = 0, alpha: float = 0.05) -> dict:
    """Full frozen §7 bundle for one primary comparison (arm ``a`` vs arm ``b``).

    Combines the Wilcoxon signed-rank test, the bootstrap CI on the median paired
    difference, and the Hodges-Lehmann effect-size estimate. ``diff = a - b``; negative
    => ``a`` wins (smaller error). Returns one dict carrying all three plus the paired n.
    """
    a_c, b_c, n_dropped = _clean_pairs(a, b)
    diffs = a_c - b_c
    boot = bootstrap_median_diff_ci(diffs, n_boot=n_boot, seed=seed, alpha=alpha)
    wil = wilcoxon_signed_rank(a_c, b_c)
    return {
        "n_pairs": int(a_c.size),
        "n_dropped": n_dropped,
        "median_diff": boot["median_diff"],
        "ci_lo": boot["ci_lo"],
        "ci_hi": boot["ci_hi"],
        "ci_alpha": float(alpha),
        "hodges_lehmann": hodges_lehmann(diffs),
        "wilcoxon_statistic": wil["statistic"],
        "wilcoxon_pvalue": wil["pvalue"],
        "n_zero": wil.get("n_zero", 0),
        "seed": int(seed),
        "n_boot": int(n_boot),
        **({"warning": wil["warning"]} if "warning" in wil else {}),
    }
