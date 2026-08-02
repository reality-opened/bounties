import { describe, it } from "vitest";

// Skeleton test file — wire these up against the real component.
//
// BEFORE/AFTER/LOADER/VALIDATING are all defined in the component file
// itself (no external data module). The honesty-critical piece is the
// "Validation in progress" section: policy-lift and dataset-salvage are
// named as *things being measured*, not given fabricated numbers — a
// regression here would be a real bug (an invented metric appearing next
// to one of those labels), so it's worth a dedicated assertion, not just a
// text-presence check.
//
// Suggested pattern:
//   import { render, screen } from "@testing-library/react";
//   import BeforeAfterDataset from "./BeforeAfterDataset";

describe("BeforeAfterDataset — data-driven rendering", () => {
  it.todo("renders the 2 'before' channels and the 5 'after' channels, each with its tag");
  it.todo("the 3 channels added by refinement (depth, trajectory, labels, quality flags) are marked with the '+' glyph / added styling; the kept RGB channel on the 'after' side is not");
  it.todo("the LeRobot loader code block renders the exact snippet, including all 5 dict-key comments (rgb/depth/state/objects/flags)");
});

describe("BeforeAfterDataset — honest pending state", () => {
  it.todo("the 'Validation in progress' badge is present in the validating section");
  it.todo("renders both validating items (Policy lift, Dataset salvage) with their explanatory detail text");
  it.todo("neither validating item renders a numeric metric (e.g. a %, ms, or mm figure) next to its label — this section must stay a stated pending-measurement, never an invented number");
});
