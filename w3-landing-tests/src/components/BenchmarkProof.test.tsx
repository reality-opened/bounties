import { describe, it } from "vitest";

// Skeleton test file — wire these up against the real component + proofData.
//
// BenchmarkProof is fully data-driven from proofData.ts (see its own
// "HONESTY CONTRACT" header comment): no number in the rendered markup should
// be hardcoded in the component, so the strongest tests here assert against
// the *imported* proofData constants, not against literal strings copy-pasted
// from the source — that way a future proofData edit can't silently drift out
// of sync with an un-updated test.
//
// Suggested pattern:
//   import { render, screen } from "@testing-library/react";
//   import BenchmarkProof from "./BenchmarkProof";
//   import { SMOOTHNESS, SMOOTHNESS_POOLED, ACCURACY, ACCURACY_POOLED, VERDICTS, ARM_C, DATASETS } from "./proofData";

describe("BenchmarkProof — data-driven rendering", () => {
  it.todo("renders one verdict chip per VERDICTS entry, with its tag/verdict/note text");
  it.todo("renders one bar row per SMOOTHNESS entry (task, dataset + camera, aJerk, bJerk, factor)");
  it.todo("bar widths are proportional to jerk value (relative to the max bJerk in SMOOTHNESS)");
  it.todo("pooled callout renders SMOOTHNESS_POOLED's jerkDiff, jerkCI, velDiff, p and floor verbatim");
  it.todo("renders one accuracy cell per ACCURACY entry (cell, detail, a, b, note)");
  it.todo("pooled accuracy line renders ACCURACY_POOLED's diff and p verbatim");
  it.todo("footer renders ARM_C's costFactor/costC/costA and DATASETS verbatim");
  it.todo("the 'Read the full benchmark' link points at /proof");
});

describe("BenchmarkProof — honest verdict semantics", () => {
  // ACCURACY includes a "loss" verdict (RH20T stacking) even though VERDICTS'
  // own tone set skews win/tie/neutral — the point of this section is that
  // losses are shown, not hidden. Pin that down explicitly.
  it.todo("the stacking accuracy cell (verdict: loss) renders with the loss tone/class, not win or tie");
  it.todo("every ACCURACY row's verdict tone maps to a distinct visual treatment (win/tie/loss are not all identical)");
});
