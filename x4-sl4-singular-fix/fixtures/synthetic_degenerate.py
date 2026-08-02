"""Synthetic degenerate 4x4 homographies standing in for the china_office crash class.

**PENDING: real crash matrices — requires a pipeline replay by us.**

We looked for the actual homography matrices that crashed SL(4) graph
insertion on the china_office recording (EXP-36: one public 8112-frame robot
recording, "SL4 Constructor: input matrix singular" in every configuration
tested) in that experiment's raw artifacts — run summaries, ATE/RPE scores,
odometry/estimated-trajectory files, frame dumps. The crash message and its
batch-run IDs are logged; the offending matrix itself was never dumped to
disk. So this file is a *stand-in*, not a replay of the real failure, built
directly from the two failure shapes the report names.

Three generators, concatenated by `degenerate_cases()`:

1. `rank_deficient_cases()`    — exact rank <4 matrices (determinant is
   exactly/near-exactly zero in floating point). This is the literal
   "input matrix singular" failure from the crash message.
2. `det_to_zero_cases()`       — singular values ``[1, 1, 1, eps]`` for eps
   sweeping ``1e-6 .. 1e-16``: determinant collapses smoothly to zero. Note
   this deliberately overlaps `normalize_to_sl4`'s existing `det_tol=1e-12`
   gate at the small-eps end (those already raise today) and deliberately
   does *not* at the large-eps end (`eps=1e-6, 1e-8, 1e-10` sail through the
   determinant check untouched today) — see the module docstring in
   `src/sl4_normalize.py`.
3. `condition_number_cases()`  — singular values
   ``[sqrt(k), 1, 1, 1/sqrt(k)]`` for condition number k sweeping
   ``1e6 .. 1e16``, with determinant held at ~1 throughout. These matrices
   pass any determinant-only check untouched (det ~= 1, nowhere near
   `det_tol`) while being numerically meaningless to scale or invert — the
   class of input a pure det-threshold gate cannot see at all. Included
   because "det → 0" and "numerically singular" are not the same hazard:
   this is the second one.

Note on scope: **negative-determinant input is intentionally excluded here.**
`tests/test_regression.py::test_negative_determinant_raises_rather_than_returning_nan`
locks that case down as a permanent raise (no real rescale can fix
`det < 0` — see `src/sl4_normalize.py`'s docstring), so it is not part of the
"add a graceful fallback" ask this bounty is about.
"""
from __future__ import annotations

import numpy as np


def _random_orthogonal(rng: np.random.Generator, n: int = 4) -> np.ndarray:
    """Haar-random orthogonal matrix via QR of a Gaussian matrix (sign-corrected
    so the result is uniformly distributed over O(n), not biased toward the
    identity as a bare `np.linalg.qr` result would be)."""
    A = rng.standard_normal((n, n))
    Q, R = np.linalg.qr(A)
    Q = Q * np.sign(np.diag(R))
    return Q


def _from_singular_values(rng: np.random.Generator, svals) -> np.ndarray:
    """Build a 4x4 matrix U @ diag(svals) @ V.T for random orthogonal U, V."""
    U = _random_orthogonal(rng)
    V = _random_orthogonal(rng)
    return U @ np.diag(svals) @ V.T


def rank_deficient_cases(seed: int = 36):
    """Exact rank <4 matrices — the literal "matrix singular" failure."""
    rng = np.random.default_rng(seed)
    cases = []

    cases.append(("rank3_svd_zero", _from_singular_values(rng, [1.0, 1.0, 1.0, 0.0])))

    # Rank 3 via a dependent row rather than an SVD construction — closer to how
    # a real bad pose estimate might arrive (rows that are accidentally, not
    # deliberately, linearly dependent).
    base = rng.standard_normal((4, 4))
    base[3, :] = base[0, :] + 2.0 * base[1, :] - base[2, :]
    cases.append(("rank3_dependent_row", base))

    cases.append(("rank2_svd_zero", _from_singular_values(rng, [1.0, 1.0, 0.0, 0.0])))
    cases.append(("rank1_svd_zero", _from_singular_values(rng, [1.0, 0.0, 0.0, 0.0])))

    return cases


def det_to_zero_cases(exponents=(6, 8, 10, 12, 14, 16), seed: int = 36):
    """Singular values [1, 1, 1, eps]; determinant collapses smoothly to zero."""
    rng = np.random.default_rng(seed)
    cases = []
    for k in exponents:
        eps = 10.0 ** (-k)
        H = _from_singular_values(rng, [1.0, 1.0, 1.0, eps])
        cases.append((f"det_to_zero_1e-{k}", H))
    return cases


def condition_number_cases(exponents=(6, 8, 10, 12, 14, 16), seed: int = 36):
    """Singular values [sqrt(k), 1, 1, 1/sqrt(k)]; determinant held at ~1 while
    condition number sweeps 1e6 .. 1e16."""
    rng = np.random.default_rng(seed)
    cases = []
    for k in exponents:
        cond = 10.0 ** k
        s = cond ** 0.5
        H = _from_singular_values(rng, [s, 1.0, 1.0, 1.0 / s])
        cases.append((f"condition_1e{k}_det_near_one", H))
    return cases


def degenerate_cases():
    """All synthetic degenerate cases as a flat (name, H) list, for parametrize()."""
    return rank_deficient_cases() + det_to_zero_cases() + condition_number_cases()


if __name__ == "__main__":
    for name, H in degenerate_cases():
        with np.printoptions(precision=3, suppress=False):
            print(f"--- {name} --- det={np.linalg.det(H):.3e} cond={np.linalg.cond(H):.3e}")
