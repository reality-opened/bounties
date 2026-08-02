"""Crash acceptance test: normalize_to_sl4 must degrade gracefully on the
china_office class of degenerate homography, not raise into a long batch job.

EXP-36 hit exactly this on one public 8112-frame robot recording: SL(4) graph
insertion crashed with a native "SL4 Constructor: input matrix singular"
error, in every configuration tested. `src/sl4_normalize.py` (this kit's
extracted copy of the function) already turns the two historical silent
failures (negative-determinant NaN blowup, exact-equality singularity check)
into a clean `ValueError` — real progress over the original bug — but a
`ValueError` raised out of a per-node call, deep inside a graph insertion that
runs thousands of times per recording, is *still* a crash from the batch
job's point of view. Nothing today stops the china_office class of input from
taking the whole run down; it just takes it down with a clearer traceback.

This test is the acceptance bar, not a description of current behavior. It is
marked `xfail(strict=True)` on purpose:

* Today it fails — either because `normalize_to_sl4` raises on the
  rank-deficient / det-near-zero cases (caught here as an unexpected
  exception, which xfail records as the expected failure), or because it
  returns a value with no observable indication that a fallback path was
  taken, since none exists yet (the `pytest.warns` assertion below then
  fails instead).
* Once you implement a numerically safe normalization with a documented,
  non-raising fallback (condition-number gate + regularized reconstruction,
  guarded SVD-based construction, or your own approach — argued in the
  README/PR), this test should start passing. `strict=True` turns that into
  an XPASS failure so you'll notice and remove the marker rather than ship a
  green suite that's secretly still asserting the old behavior.

Contract being tested (see README "Acceptance criteria" for the full text):
  - no exception propagates out of `normalize_to_sl4` for any case in
    `fixtures.synthetic_degenerate.degenerate_cases()`;
  - the fallback is *documented at runtime*, not just in a comment — a
    `Warning` (any subclass: `UserWarning`, a custom warning class, etc.) is
    the mechanism this test checks for, since it's observable without
    changing the function's return type (which the 20 cases in
    `tests/test_regression.py` depend on staying a bare (4, 4) ndarray);
  - the returned matrix is still finite and still (approximately) in SL(4)
    — a fallback that returns garbage instead of raising garbage is not an
    improvement.

Negative-determinant input is out of scope here on purpose: that case has no
real fallback (no real rescale fixes `det < 0`) and stays a permanent raise —
see `tests/test_regression.py::test_negative_determinant_raises_rather_than_returning_nan`
and `fixtures/synthetic_degenerate.py`'s module docstring.
"""

import numpy as np
import pytest

from fixtures.synthetic_degenerate import degenerate_cases
from src.sl4_normalize import normalize_to_sl4


@pytest.mark.xfail(
    strict=True,
    reason=(
        "normalize_to_sl4 currently raises ValueError on the rank-deficient/"
        "det-near-zero cases, and has no documented (warned) fallback at all "
        "for the ill-conditioned-but-det-near-1 cases. Implementing a "
        "non-raising, documented fallback is the task -- see README Acceptance "
        "criteria."
    ),
)
@pytest.mark.parametrize("name,H", degenerate_cases(), ids=[c[0] for c in degenerate_cases()])
def test_degenerate_matrix_falls_back_without_raising(name, H):
    with pytest.warns(Warning):
        result = normalize_to_sl4(H)

    assert result.shape == (4, 4)
    assert np.all(np.isfinite(result)), f"{name}: fallback result must not contain NaN/inf"
    assert np.linalg.det(result) == pytest.approx(1.0, rel=1e-6), (
        f"{name}: a fallback that doesn't land in (approximately) SL(4) isn't a "
        "usable substitute for the value the graph library needs"
    )
