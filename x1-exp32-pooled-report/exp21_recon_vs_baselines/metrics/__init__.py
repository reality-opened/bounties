"""EXP-21 metric stack (Layer 1 geometry + Layer 2 data-quality + paired stats).

Pure-numpy / scipy, CPU-only. Every function is unit-tested against a synthetic
case with a KNOWN answer (mirroring ``experiments/slam_bench/test_metrics.py`` style):
zero-error self-consistency, a pinned scale/shift, and a degenerate rejection.

Submodules
----------
  alignment  Umeyama Sim(3)/SE(3) alignment (vendored pure-numpy; evo-consistent
             direction: aligns ``src`` -> ``tgt``, whole trajectory).
  layer1     EE position error (mm, Sim(3)/SE(3)-aligned, NaN-gap-aware + coverage),
             rotation error (deg), ATE/RPE wrappers.
  layer2     action jerk, static-object world-RMS spread (EXP-15 machinery),
             occlusion-stratified error curve.
  stats      Wilcoxon signed-rank + bootstrap CI on the median paired difference +
             Hodges-Lehmann estimate (preregistration §7).
"""

from . import alignment, layer1, layer2, stats

__all__ = ["alignment", "layer1", "layer2", "stats"]
