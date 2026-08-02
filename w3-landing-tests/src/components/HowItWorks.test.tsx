import { describe, it } from "vitest";

// Skeleton test file — wire these up against the real component.
//
// HowItWorks has no external data module (TRUNK/ISAAC are defined in the
// component file itself) and no interactive elements — coverage here is
// about the pipeline's structure and its "experimental" honesty framing,
// not about props or state.
//
// Suggested pattern:
//   import { render, screen } from "@testing-library/react";
//   import HowItWorks from "./HowItWorks";

describe("HowItWorks — data-driven rendering", () => {
  it.todo("renders the 4 trunk stages in order (Demo video, 3D reconstruction, Grounding + QA, LeRobot dataset)");
  it.todo("each trunk stage shows its role, title, body and artifact text");
  it.todo("a rail connector renders between consecutive trunk stages, but not after the last one");
});

describe("HowItWorks — honest experimental framing", () => {
  it.todo("the Isaac sim preview stage is visually/semantically flagged as 'Experimental / preview' (badge + roleWarn styling), not presented as shipped");
  it.todo("the Isaac stage's body text does not claim a validated sim-to-real result");
});
