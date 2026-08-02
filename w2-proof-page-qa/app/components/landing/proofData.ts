/* EXP-21 "reconstruction vs baselines" — the numbers behind the proof section.
 *
 * HONESTY CONTRACT (do not break — this site has a standing "no fake metrics" rule):
 *   • Every figure here traces to a file under
 *     platform/experiments/exp21_recon_vs_baselines/results/ — the source path is
 *     cited on each block. No rounded-up or invented numbers.
 *   • Lead with the smoothness / data-quality win (true in every cell). Accuracy is
 *     cell-dependent and is presented with its ties AND losses, never as a blanket
 *     "we are more accurate."
 *   • No absolute-metric overclaim: OpenReality ships scale-normalized metres; true
 *     metres need one reference measurement. The H2 block is an honest negative.
 *   • Method framing, not category-kill: we compare against a *method* (2D-keypoint
 *     annotation) and a *tool* (off-the-shelf 3D Gaussian splatting), never "we beat
 *     labeling companies."
 *
 * Ground truth is public robot datasets only (DROID CC-BY 4.0, RH20T, FMB) — no
 * customer / pilot data appears anywhere here. */

/* ── Competitor naming ──
 * Brand names ENABLED by founder 2026-07-10, method-framed per honesty rule #4:
 * copy reads "Encord's 2D-keypoint annotation" / "Splatica's off-the-shelf
 * splatting" — never "we beat the company". The baselines are *representative* of
 * each incumbent's method (Arm B ≈ Encord-style keypoint labeling; Arm C ≈
 * Splatica-style off-the-shelf splatting), not their exact products.
 * To revert to neutral framing, set these back to method categories
 * ("Encord" → "2D-keypoint annotation", etc.); nothing downstream hard-codes brands. */
export const BASELINES = {
  keypoint: "Encord", // short label — legend / table header
  keypointLong: "Encord's 2D-keypoint annotation", // in-sentence, method-framed
  splat: "Splatica's off-the-shelf 3D Gaussian splatting", // in-sentence, method-framed
  splatShort: "Splatica", // short label — chip / tag
} as const;

export type Verdict = "win" | "tie" | "loss" | "neutral";

/* ── Headline: temporal smoothness (action jerk, lower = smoother) ──
 * Source: results/layer2_summary.md (per-cell median jerk rows) + REPORT.md:87-93.
 * factor = B-strong median ÷ A median (report-computed; verified). */
export type SmoothnessRow = {
  task: string;
  dataset: string;
  camera: string;
  aJerk: number; // Arm A (OpenReality) median action jerk, m/s³
  bJerk: number; // baseline (Depth Pro / 2D-keypoint variant) median jerk, m/s³
  factor: string; // "×N smoother"
};

export const SMOOTHNESS: SmoothnessRow[] = [
  // layer2_summary.md:26 (pick_place · wrist_cam · clean)
  { task: "Pick-and-place", dataset: "DROID", camera: "wrist cam", aJerk: 13.2, bJerk: 108.9, factor: "8.2×" },
  // layer2_summary.md:16 (insertion · wrist_cam · clean)
  { task: "Insertion", dataset: "FMB", camera: "wrist cam", aJerk: 11.7, bJerk: 269.6, factor: "23×" },
  // layer2_summary.md:36 (stacking · wrist_cam · clean)
  { task: "Stacking", dataset: "RH20T", camera: "in-hand", aJerk: 2.85, bJerk: 104.5, factor: "37×" },
];

/* Pooled paired test across all moving-camera cells. Source: layer2_summary.md:48,57,60-89. */
export const SMOOTHNESS_POOLED = {
  jerkDiff: "−106.3 m/s³", // layer2_summary.md:48 (median diff vs B-strong, n=69)
  jerkCI: "[−157.8, −66.5]", // 95% CI, layer2_summary.md:48
  velDiff: "−30.6 m/s²", // layer2_summary.md:57 (velocity-noise median diff, n=71)
  p: "p < 1e-6", // Wilcoxon, both tests
  floor: "0 / 24", // layer2_summary.md:60-89 — arms flagged as smoother-than-encoder-truth (over-smoothing)
} as const;

/* ── Position accuracy — CELL-DEPENDENT. Show wins, ties, AND losses. ──
 * Source: results/layer1_summary.md + the per-cell paired files. End-effector
 * position error (mm, lower = better) on moving-camera capture. */
export type AccuracyRow = {
  cell: string;
  detail: string;
  a: string; // Arm A error
  b: string; // best baseline error
  verdict: Verdict;
  note: string;
};

export const ACCURACY: AccuracyRow[] = [
  {
    cell: "Pick-and-place",
    detail: "DROID · moving camera",
    a: "34.9 mm",
    b: "≈79 mm",
    verdict: "win",
    note: "≈2.2× tighter · paired −18.5 mm, p ≈ 0.01", // layer1_summary.md:23; paired droid p=0.0123
  },
  {
    cell: "Insertion",
    detail: "FMB · moving camera",
    a: "18.8 mm",
    b: "18.6 mm",
    verdict: "tie",
    note: "statistical tie · p ≈ 0.4", // layer1_summary.md:16; paired fmb p=0.381
  },
  {
    cell: "Stacking",
    detail: "RH20T · in-hand, contact-rich",
    a: "19.5 mm",
    b: "9.6 mm",
    verdict: "loss",
    note: "baseline wins close range · p ≈ 0.07–0.10", // layer1_summary.md:32; paired rh20t
  },
];

/* Pooled across all moving-camera cells — an honest tie. layer1_summary.md:43. */
export const ACCURACY_POOLED = {
  diff: "−2.6 mm",
  ci: "[−11.1, 3.2]",
  p: "p = 0.157",
} as const;

/* ── Verdict strip — one chip per hypothesis, traffic-light semantics. ── */
export type VerdictChip = {
  tag: string;
  headline: string;
  verdict: string;
  tone: Verdict;
  note: string;
};

export const VERDICTS: VerdictChip[] = [
  {
    tag: "H3 · data quality",
    headline: "Temporal coherence",
    verdict: "Decisive win",
    tone: "win",
    note: "8–37× smoother trajectories, every task, p < 1e-6",
  },
  {
    tag: "H1 · accuracy",
    headline: "Position error",
    verdict: "Cell-dependent",
    tone: "tie",
    note: "wins moving-camera pick-place, ties insertion, loses close-range stacking",
  },
  {
    tag: `Arm C · ${BASELINES.splatShort}`,
    headline: "Splatting",
    verdict: "Visualization-grade",
    tone: "tie",
    note: "no trajectory at all, ghosts the moving object, ≈4× the cost",
  },
  {
    tag: "H2 · absolute scale",
    headline: "Metric scale",
    verdict: "Honest negative",
    tone: "neutral",
    note: "no method hits usable absolute metres on this data — one reference fixes it",
  },
];

/* ── Arm C (off-the-shelf 3D Gaussian splatting) facts. armC/summary.md. ── */
export const ARM_C = {
  costA: "$0.075", // per episode, Arm A — armC/summary.md:42
  costC: "$0.31", // per episode, Arm C full pipeline — armC/summary.md:42
  costFactor: "≈4×",
} as const;

/* ── Provenance / method-integrity notes (build credibility, all true). ── */
export const DATASETS = "DROID · RH20T · FMB"; // public robot datasets, encoder / mocap ground truth
export const REPRODUCE =
  "experiments/exp21_recon_vs_baselines/ · every number traces to results/*_summary.md";
