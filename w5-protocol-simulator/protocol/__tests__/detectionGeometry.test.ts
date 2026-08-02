import { describe, expect, it } from 'vitest';
import {
  isBox2D,
  isMaskRle,
  type DetectionResult,
  type SceneEvidenceRef,
} from '../types';

/**
 * `box_2d` / `mask_rle` are the real, optional 2D SAM detection geometry fields the server
 * added to live-broadcast detections and persisted grounding evidence — see
 * platform/contracts/export-format.md § "Grounding evidence: persisted 2D detection
 * geometry". Both fields are additive: a payload that omits them must still type-check and
 * pass these guards for the surrounding object, which is why the guards below only assert
 * on the field itself, never require it.
 */

describe('isBox2D', () => {
  it('accepts a well-formed [x0,y0,x1,y1] box', () => {
    expect(isBox2D([10, 20, 110, 220])).toBe(true);
  });

  it('accepts negative/zero coordinates (still finite numbers)', () => {
    expect(isBox2D([0, 0, 0, 0])).toBe(true);
  });

  it('rejects the wrong arity', () => {
    expect(isBox2D([10, 20, 110])).toBe(false);
    expect(isBox2D([10, 20, 110, 220, 5])).toBe(false);
  });

  it('rejects non-numeric / non-finite entries', () => {
    expect(isBox2D([10, 20, 110, NaN])).toBe(false);
    expect(isBox2D([10, 20, 110, '220'] as unknown[])).toBe(false);
  });

  it('rejects non-array input without throwing', () => {
    expect(isBox2D(undefined)).toBe(false);
    expect(isBox2D(null)).toBe(false);
    expect(isBox2D({ x0: 1 })).toBe(false);
  });
});

describe('isMaskRle', () => {
  const wellFormed = { size: [480, 640], counts: [0, 120, 30, 890], order: 'C' as const };

  it('accepts a well-formed RLE mask', () => {
    expect(isMaskRle(wellFormed)).toBe(true);
  });

  it('accepts an empty counts run (degenerate mask)', () => {
    expect(isMaskRle({ ...wellFormed, counts: [] })).toBe(true);
  });

  it('rejects a bad size arity', () => {
    expect(isMaskRle({ ...wellFormed, size: [480, 640, 3] })).toBe(false);
  });

  it('rejects a non-"C" order', () => {
    expect(isMaskRle({ ...wellFormed, order: 'F' })).toBe(false);
  });

  it('rejects non-finite counts', () => {
    expect(isMaskRle({ ...wellFormed, counts: [0, Infinity] })).toBe(false);
  });

  it('rejects non-object input without throwing', () => {
    expect(isMaskRle(undefined)).toBe(false);
    expect(isMaskRle('nope')).toBe(false);
  });
});

describe('DetectionResult and SceneEvidenceRef stay valid with box_2d/mask_rle omitted', () => {
  it('DetectionResult type-checks without the new optional fields', () => {
    const d: DetectionResult = { success: true, query: 'laptop' };
    expect(isBox2D(d.box_2d)).toBe(false); // undefined -> guard says "not present", not a throw
  });

  it('DetectionResult type-checks with both new optional fields present', () => {
    const d: DetectionResult = {
      success: true,
      query: 'laptop',
      box_2d: [4, 5, 100, 120],
      mask_rle: { size: [480, 640], counts: [0, 42], order: 'C' },
    };
    expect(isBox2D(d.box_2d)).toBe(true);
    expect(isMaskRle(d.mask_rle)).toBe(true);
  });

  it('SceneEvidenceRef type-checks with global_frame_index + box_2d present', () => {
    const e: SceneEvidenceRef = {
      submap_id: 1,
      frame_idx: 4,
      global_frame_index: 14,
      box_2d: [10, 10, 50, 60],
    };
    expect(isBox2D(e.box_2d)).toBe(true);
  });
});
