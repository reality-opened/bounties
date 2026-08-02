import "@testing-library/jest-dom/vitest";

// Trimmed from the production app's test/setup.ts: the two mocks there
// (driver.js, @clerk/nextjs) exist for onboarding/auth code that isn't part
// of this kit — none of the 5 components under test import either package,
// so there is nothing to mock here. See README "What's in this repo" for
// why CaptureComparison's `three` import needs no mock either (jsdom has no
// WebGL context, so the component always takes its own static-fallback
// branch — see the note at the top of CaptureComparison.test.tsx).
