import { describe, it } from 'vitest';

// Skeleton test file — wire these up as you implement `src/maskOverlay.ts`.
//
// Fixtures live in `../fixtures/*.json`. Each has the shape:
//   { name, description, valid, mask_rle: MaskRLE, decoded: number[][] | null, expected_error }
// `decoded` (when `valid` is true) is the oracle: a H x W matrix of 0/1 ints in row-major order,
// matching the flat buffer `decodeMaskRle` should produce (reshape as needed to compare).
//
// Suggested loading pattern (adjust to however you end up importing JSON in this project):
//   import filledSquare from '../fixtures/filled_square_16x16.json';
//   import ring from '../fixtures/ring_32x32.json';
//   import diagonal from '../fixtures/diagonal_24x24.json';
//   import empty from '../fixtures/empty_64x64.json';
//   import invalid from '../fixtures/invalid_counts_mismatch_8x8.json';
// (`resolveJsonModule` is already on in tsconfig.json for this.)

describe('decodeMaskRle', () => {
  it.todo('decodes filled_square_16x16 to match its oracle matrix');
  it.todo('decodes ring_32x32 to match its oracle matrix');
  it.todo('decodes diagonal_24x24 to match its oracle matrix');
  it.todo('decodes empty_64x64 (all-zero buffer, correct length)');
  it.todo('rejects invalid_counts_mismatch_8x8 with a typed error (not a short/padded buffer)');
  it.todo('rejects a mask_rle that fails isMaskRle (wrong order, non-numeric counts, etc.)');
});

describe('drawMaskOverlay', () => {
  it.todo('composites a decoded mask onto a canvas rect with alpha blending (color/alpha opts respected)');
  it.todo('handles a mask whose size does not match the destination rect (scales, does not throw)');
  it.todo('handles a missing/invalid mask without throwing and without a misleading draw (document + test the chosen no-op behavior)');
  it.todo('handles an oversized mask (size far larger than the canvas) without throwing or hanging, clipped to canvas bounds');
});
