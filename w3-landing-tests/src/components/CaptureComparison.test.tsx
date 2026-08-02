import { describe, it } from "vitest";

// Skeleton test file — wire these up against the real component.
//
// IMPORTANT — read before writing assertions here:
// jsdom has no WebGL context (`canvas.getContext("webgl2"|"webgl"|
// "experimental-webgl")` returns null / not-implemented in plain jsdom, with
// no `canvas` npm package installed). `shouldUseStaticFallback()` in
// src/utils/webgl.ts therefore evaluates to `true` in every test in this
// file, and `PointCloudViewer` always takes its static-fallback branch —
// the real `PointCloudEngine` class (three.js scene/renderer/PLYLoader) is
// defined but NEVER instantiated here. That's *why* this kit can list
// `three` as a plain dependency (see package.json) without needing to mock
// it: its exports are imported but never called under jsdom.
//
// Practically this means:
//   - You CAN fully test: object switching, per-object copy/attribution,
//     the coverage/legend text, the fallback aria-labels and the "points:
//     unavailable" honesty path (count === "unavailable" -> "—").
//   - You CANNOT exercise the actual point-cloud render or the loaded
//     point-count path (count === number) in jsdom — that would need either
//     a real browser (Playwright/e2e, out of scope for this kit) or an
//     explicit mock of PointCloudEngine. Don't fake a "points loaded"
//     assertion by mocking around the fallback — document the gap instead
//     if you want to flag it in the PR description.
//
// Suggested pattern:
//   import { render, screen } from "@testing-library/react";
//   import userEvent from "@testing-library/user-event";
//   import CaptureComparison from "./CaptureComparison";

describe("CaptureComparison — data-driven rendering (default object: mug)", () => {
  it.todo("renders a 'Casual pass' and a 'Deliberate pass' card, with their coverage text ('partial · one side missing' vs 'complete · all sides')");
  it.todo("renders the attribution line with the mug's exact modelName ('Cole Hardware Mug Classic Blue') and the CC BY 4.0 license link");
  it.todo("renders the 3 object selector tabs (Ceramic mug, Toy lion, Toy school bus) with 'Ceramic mug' marked pressed/active");
});

describe("CaptureComparison — honest fallback state (jsdom has no WebGL)", () => {
  it.todo("both viewer regions render the static-fallback aria-label ('... 3D preview unavailable on this device'), not a fabricated 3D canvas");
  it.todo("both cards' point count reads '—' (not a fake number, not stuck on 'loading…' forever) once the fallback resolves");
  it.todo("both cards' caption reads '3D preview unavailable on this device'");
});

describe("CaptureComparison — interaction: switching objects", () => {
  it.todo("clicking 'Toy lion' switches both cards to the lion's casual/deliberate sources and updates the attribution to 'Schleich Lion Action Figure'");
  it.todo("clicking 'Toy school bus' switches to the bus ('Sonny School Bus') and back to 'Ceramic mug' restores the mug's copy");
  it.todo("switching objects resets point-count display back through its pending state rather than showing the previous object's stale count");
});
