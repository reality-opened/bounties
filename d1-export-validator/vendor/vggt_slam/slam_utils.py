"""Trimmed, standalone ``decompose_camera`` — extracted from ``core/vggt_slam/slam_utils.py``.

The real module (in the ``core`` repo, imported as ``vggt_slam`` by the ``server`` repo) pulls in
``torch``, ``torchvision`` and ``matplotlib`` at import time for functions this fixture generator
never calls. ``decompose_camera`` itself is pure numpy/scipy, so it is copied verbatim here
(only the missing ``import scipy.linalg`` was added explicitly — the original relies on some
other module having already imported that submodule first) to keep this kit's dependency
footprint to numpy/scipy/pandas/pyarrow/opencv/pydantic. This is NOT the canonical
implementation; see the ``core`` repo for that.
"""

from __future__ import annotations

import numpy as np
import scipy.linalg


def decompose_camera(P, no_inverse=False, homog_tol=1e-12):
    """
    Decompose a 3x4 or 4x4 camera projection matrix P into intrinsics K,
    rotation R, and translation t.

    For 4x4 input the matrix is first dehomogenized by its (3,3) entry; that entry must
    be non-negligible relative to the matrix scale (see ``homog_tol``) or a ValueError is
    raised rather than NaNs being handed to the RQ decomposition.
    """
    if P.shape[0] != 3:
        # Dehomogenize. An SL(4) submap pose can drive P[3,3] to ~0 (projectively singular
        # pose — the camera centre sits on the plane at infinity). Dividing by it then
        # yields inf/NaN and scipy.linalg.rq dies with an opaque LAPACK error that names
        # neither the bad pose nor the real cause. The test is RELATIVE to the matrix
        # scale because P and cP are the same projective camera.
        scale_ref = np.max(np.abs(P))
        if not np.isfinite(scale_ref) or scale_ref == 0.0 or abs(P[-1, -1]) < homog_tol * scale_ref:
            raise ValueError(
                f"decompose_camera: cannot dehomogenize a 4x4 projection matrix whose "
                f"[3,3] entry ({P[-1, -1]:.3e}) is negligible against the matrix scale "
                f"({scale_ref:.3e}). This is the signature of a singular / ideal-plane "
                f"SL(4) submap pose; inspect the pose graph for a degenerate submap "
                f"instead of decomposing this camera."
            )
        P = P / P[-1, -1]
        P = P[0:3, :]

    # Ensure P is (3,4)
    assert P.shape == (3, 4)

    # Left 3x3 part
    M = P[:, :3]

    # RQ decomposition
    K, R = scipy.linalg.rq(M)

    # Make sure intrinsics have positive diagonal
    if K[0, 0] < 0:
        K[:, 0] *= -1
        R[0, :] *= -1
    if K[1, 1] < 0:
        K[:, 1] *= -1
        R[1, :] *= -1
    if K[2, 2] < 0:
        K[:, 2] *= -1
        R[2, :] *= -1

    # The diagonal sign fixes above can leave an improper rotation (det(R) = -1):
    # RQ only guarantees orthogonality, and each row flip toggles the determinant.
    # P and -P are the same projective camera, so fold the sign into (R, t) by
    # decomposing -P instead — K keeps its positive diagonal, R becomes proper.
    # Without this, quaternion conversion downstream raises on real sequences.
    p3 = P[:, 3]
    if np.linalg.det(R) < 0:
        R = -R
        p3 = -p3

    scale = K[2, 2]
    if not no_inverse:
        R = np.linalg.inv(R)
        t = -R @ np.linalg.inv(K) @ p3
    else:
        t = np.linalg.inv(K) @ p3
    K = K / scale

    return K, R, t, scale
