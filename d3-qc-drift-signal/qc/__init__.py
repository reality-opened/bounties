"""Scan-confidence QC (GT-free reconstruction gating).

GT-free self-consistency scoring for reconstructions, so products (reports,
exports, embeds) can be gated on measured confidence instead of hope. Signal
choice and initial thresholds are calibrated on a measured failure-mode study
of long, loopy, wide-FOV robot tours (EXP-36) — see tests/fixtures/exp36/ for
the regression fixtures — and should be recalibrated as pilot-scan positives
accumulate.
"""

from qc.confidence import ConfidenceLevel, ScanConfidence, compute_confidence

__all__ = ["ConfidenceLevel", "ScanConfidence", "compute_confidence"]
