# Bounty W3 — Landing component test suite
**Track:** Web & design · **Access ring:** 2 · **Size:** M (~4 days)

## Context
Our marketing site's landing page is a set of standalone, data-driven React
components — no shared page state, most with no props at all. They render
real numbers from a typed data module (`proofData.ts`) or explicit
"validation in progress" placeholders where a metric doesn't exist yet
(never an invented number). None of that is under unit test today. This kit
carries a **self-contained** subset of 5 of those components — their exact
import graph, nothing else from the production app — so the test layer can
be built without touching auth, the API routes, or anything customer-facing.

## The task
Write the unit-test layer for these 5 components:

- `BenchmarkProof.tsx` (+ `proofData.ts`)
- `HowItWorks.tsx`
- `BeforeAfterDataset.tsx`
- `MotionTracking.tsx`
- `CaptureComparison.tsx`

For each, cover:
1. **Data-driven rendering** — numbers/copy sourced from a data module (or
   from the component's own constants) render exactly where the component
   claims they do. Prefer asserting against the *imported* constants over
   copy-pasted literals, so a future data edit can't silently desync a test.
2. **Edge / honest states** — every place the real site deliberately shows
   "validation in progress" instead of a number (`BeforeAfterDataset`'s
   validating section, every mode's metric pill in `MotionTracking`) must be
   tested as an honest pending state, not skipped. `CaptureComparison` has
   its own honest-fallback state too — see the note at the top of
   `CaptureComparison.test.tsx` about why jsdom always takes that branch.
3. **Interaction states**, where present — `MotionTracking`'s mode toggle and
   `CaptureComparison`'s object selector are the two components with real
   interactive state; `BenchmarkProof`, `HowItWorks` and `BeforeAfterDataset`
   are static (say so in the PR rather than forcing an interaction test that
   doesn't apply).

A skeleton test file per component already exists next to its source
(`src/components/*.test.tsx`), each with `it.todo(...)` placeholders
describing the required cases — read those first, then replace the
`it.todo` calls with real assertions. Add more cases if you find gaps; the
list is a floor, not a ceiling.

## What's in this repo
```
package.json            deps + scripts (test, test:coverage, typecheck) — not installed, see below
tsconfig.json            strict TS config
vitest.config.ts          jsdom environment + coverage config; include glob is src/**/*.test.{ts,tsx}
test/setup.ts             jest-dom matchers only — see its comment for why no other mocks are needed

test-stubs/                minimal local stand-ins so this kit never needs the `next` package
  next-image.tsx            next/image -> plain <img>, scoped to the props MotionTracking passes it
  next-link.tsx             next/link -> plain <a>, scoped to the props BenchmarkProof passes it

src/
  components/
    BenchmarkProof.tsx        = production file, byte-identical except the next/link import line
                               (rewired to test-stubs/next-link — see the "KIT NOTE" comment in the file)
    BenchmarkProof.module.css  byte-identical
    BenchmarkProof.test.tsx    skeleton — THE BOUNTY
    proofData.ts               byte-identical (all copy/numbers; do not edit — it's the honesty
                                contract source, see its own header comment)
    HowItWorks.tsx              byte-identical (no next/* imports, nothing to rewire)
    HowItWorks.module.css       byte-identical
    HowItWorks.test.tsx         skeleton — THE BOUNTY
    BeforeAfterDataset.tsx       byte-identical
    BeforeAfterDataset.module.css byte-identical
    BeforeAfterDataset.test.tsx   skeleton — THE BOUNTY
    MotionTracking.tsx            = production file, byte-identical except the next/image import
                                   line (rewired to test-stubs/next-image)
    MotionTracking.module.css      byte-identical
    MotionTracking.test.tsx        skeleton — THE BOUNTY
    CaptureComparison.tsx           = production file, byte-identical except the webgl.ts import
                                     path (shortened — see the "KIT NOTE" comment in the file; this
                                     kit flattens app/utils/ to src/utils/, one level closer)
    CaptureComparison.module.css    byte-identical
    CaptureComparison.test.tsx      skeleton — THE BOUNTY, with an important note about jsdom + WebGL
  utils/
    webgl.ts                  byte-identical — CaptureComparison's only non-CSS, non-next import
```

**Excluded on purpose** (per the kit brief): `contact.ts`, anything Clerk
(`@clerk/nextjs`), the API routes, e2e/Playwright specs, and every other
landing component not listed above (`HeroSection`, `SpatialAgentDemo`,
`ScenesShowcase`, etc.) — none of the 5 in-scope components import any of
them. `app/globals.css` is also excluded: the 5 components reference a few
global classnames (`landing-section`, `container`, `section-kicker`, …) for
layout only, with no behavior riding on them — unit tests query by role,
text and aria-label, not by visual layout, so no stylesheet is needed for
this kit's scope. `packages/design/tokens.ts` was read for context only
(the CSS modules consume design tokens as CSS custom properties, e.g.
`--paper-bright` in `CaptureComparison.tsx` — only reached inside the real
WebGL render path, which jsdom never takes here — see
`CaptureComparison.test.tsx`); it isn't part of this repo.

## Acceptance criteria
- All 5 components have real tests (no component skipped, none left as
  `it.todo`).
- No snapshot-only tests — every test asserts specific, meaningful behavior
  (rendered text/attributes/roles, not an opaque snapshot blob).
- `npm test` is green.
- `npm run test:coverage` runs, and the PR description includes its summary
  (per-file % is fine — the point is an honest coverage number, not 100%
  for its own sake).
- Where a component has no interactive state, say so explicitly in the PR
  rather than manufacturing an interaction test.

## Getting started
```bash
npm install
npm test              # currently: 5 files, all it.todo — replace with real assertions
npm run test:coverage
npm run typecheck
```

**Honesty note:** this scaffold was assembled offline and `npm install` has
not been run against it here — treat the above as untested. If something in
the config doesn't resolve once you install (a version mismatch, a missing
peer, an import path that needs one more adjustment), fixing the scaffold is
in-scope and appreciated; flag what you fixed in the PR description. One
thing already worth knowing going in: `CaptureComparison.tsx` statically
imports `three` and two of its `examples/jsm/*` subpaths — that's a real
dependency of the component (kept in `package.json`), even though jsdom's
lack of a WebGL context means the three.js code path itself never runs in
these tests (see the note at the top of `CaptureComparison.test.tsx`).

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
