import { describe, it } from "vitest";

// Skeleton test file — wire these up against the real component.
//
// MotionTracking's mode toggle (depth / tracks / masks) is the interaction
// surface for this kit's 5 components. Note the stub Image component
// (test-stubs/next-image) renders a plain <img> — the backdrop photo itself
// isn't meaningful to assert on, but its alt text is.
//
// Suggested pattern:
//   import { render, screen } from "@testing-library/react";
//   import userEvent from "@testing-library/user-event";
//   import MotionTracking from "./MotionTracking";

describe("MotionTracking — data-driven rendering (default mode)", () => {
  it.todo("defaults to the 'depth' mode: shows its reading, purpose and legend rows");
  it.todo("renders the 3 mode toggle buttons (Depth, Point tracks, Motion masks) with Depth marked active/pressed");
  it.todo("renders the depth overlay's near/far legend and NOT the tracks or masks overlay markup");
});

describe("MotionTracking — interaction: switching modes", () => {
  it.todo("clicking 'Point tracks' switches the active mode: caption/purpose/legend update to the tracks copy, aria-pressed moves to that button, and the SAME 4 tracked points (p0-p3) render as a trail across their 3 frame positions");
  it.todo("clicking 'Motion masks' switches to the masks overlay (moving-subject region + 'moving subject' tag) and updates the legend to dynamic/static");
  it.todo("clicking back to 'Depth' restores the depth-mode copy and overlay");
});

describe("MotionTracking — honest pending state", () => {
  it.todo("every mode's metric pill shows its metric name (depth RMSE / track reprojection error / dynamic-static IoU) paired with the literal status 'validation in progress', never a number");
  it.todo("the 'Illustrative' tag and the caption note (schematic, not model output) are present regardless of mode");
});
