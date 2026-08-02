# Bounty W1 — Segmentation-mask overlay for Detect
**Track:** Web & design · **Access ring:** 2 · **Size:** M (~3.5 days)

## Context
Our web product's Detect stage renders 2D evidence boxes over keyframe thumbnails during scene
review, but has no way to render the segmentation masks the pipeline already produces alongside
those boxes. The wire contract already types the mask (`MaskRLE` + an `isMaskRle` guard) and a
working box-overlay module already ships as the pattern to follow. The only missing piece is the
mask side: decode the run-length encoding and composite it as a translucent overlay.

## The task
Implement decodeMaskRle + drawMaskOverlay so the Detect stage can composite segmentation masks over evidence thumbnails, mirroring the shipped box-overlay pattern (src/detectionBox.ts is the reference). Integration into the product app is done by us after acceptance.

Both functions are stubbed in `src/maskOverlay.ts` with full doc comments describing the
contract (inputs, chosen return/parameter shapes, error behavior). Read that file's comments
first — they're the actual spec, not just decoration.

## What's in this repo
```
package.json           deps + scripts (test, typecheck) — not installed, see Getting started
tsconfig.json           strict TS config (ES2022 + DOM lib, for CanvasRenderingContext2D)
vitest.config.ts        test runner config (node environment)

src/
  protocolTypes.ts      MaskRLE / Box2D types + their hand-written guards (isMaskRle, isBox2D),
                         extracted from the real cross-repo protocol contract
  detectionBox.ts        SHIPPED reference pattern: box_2d -> percent-rect, the module to mirror
  maskOverlay.ts          <-- THE BOUNTY: decodeMaskRle + drawMaskOverlay, stubbed, doc-commented

test/
  detectionBox.test.ts    passing tests for the reference pattern (run these first to confirm
                           your toolchain works before touching anything)
  maskOverlay.test.ts     skeleton test file, it.todo(...) per required case — fill these in

fixtures/                 5 JSON fixtures: encoded MaskRLE + oracle decoded matrix each
  filled_square_16x16.json
  ring_32x32.json
  diagonal_24x24.json
  empty_64x64.json
  invalid_counts_mismatch_8x8.json   deliberately-invalid encoding, for the error path

scripts/
  make_fixtures.py        stdlib-only Python that generated fixtures/*.json (reruns + self-checks
                           round-trip encode/decode; you shouldn't need to touch this, but it's
                           here so you can see exactly how the oracles were produced)

docs/
  rle-format.md           the exact RLE encoding, in words, with worked examples incl. the
                           invalid-encoding case — read this before writing decodeMaskRle
```

## Acceptance criteria
- decodeMaskRle passes all fixture oracles, rejects the invalid fixture with a typed error.
- drawMaskOverlay composites correctly (alpha over a canvas rect), handles missing/oversized masks gracefully (no throw, no silent misrender — document the chosen behavior).
- Unit tests cover every fixture + error paths; `npm test` and `npm run typecheck` green.
- A tiny demo.html that loads a fixture and renders the overlay on a canvas (for visual review).

## Getting started
This kit was assembled offline and has **not** been installed or built — treat `npm test` /
`npm run typecheck` as untested until you run them.

```bash
npm install
npm test         # should show test/detectionBox.test.ts passing + maskOverlay.test.ts as todo
npm run typecheck
```

Suggested order:
1. Run the above to confirm the toolchain works and see the passing reference tests.
2. Read `docs/rle-format.md` in full — it has the encoding rule plus a worked invalid example.
3. Read the doc comments in `src/maskOverlay.ts` — they specify the exact contract to implement.
4. Implement `decodeMaskRle` first; wire up the `test/maskOverlay.test.ts` decode cases against
   `fixtures/*.json` (replace the `it.todo(...)` calls with real assertions).
5. Implement `drawMaskOverlay`, using `src/detectionBox.ts` as the geometry/discipline reference.
6. Build the `demo.html` called out in the acceptance criteria (plain HTML + a `<script type="module">`
   is fine — load a fixture's JSON, decode it, draw it on a `<canvas>`).
7. Regenerating fixtures (not required, but available): `python3 scripts/make_fixtures.py`
   (Python 3, standard library only, no pip installs).

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
