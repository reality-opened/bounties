import { describe, expect, it } from 'vitest';
import { boxToPercentRect } from '../src/detectionBox';

describe('boxToPercentRect', () => {
  it('scales a pixel box_2d to percentages of the natural keyframe size', () => {
    const rect = boxToPercentRect([10, 20, 50, 60], 100, 200);
    expect(rect).not.toBeNull();
    expect(rect!.left).toBeCloseTo(10, 10);   // 10/100
    expect(rect!.top).toBeCloseTo(10, 10);    // 20/200
    expect(rect!.width).toBeCloseTo(40, 10);  // (50-10)/100
    expect(rect!.height).toBeCloseTo(20, 10); // (60-20)/200
  });

  it('normalizes a flipped corner order', () => {
    const flipped = boxToPercentRect([50, 60, 10, 20], 100, 200);
    const normal = boxToPercentRect([10, 20, 50, 60], 100, 200);
    expect(flipped).toEqual(normal);
  });

  it('clamps out-of-bounds coordinates to [0,100]%', () => {
    const rect = boxToPercentRect([-10, -10, 250, 400], 100, 200);
    expect(rect).toEqual({ left: 0, top: 0, width: 100, height: 100 });
  });

  it('returns null when the natural size is unknown (image not yet loaded)', () => {
    expect(boxToPercentRect([10, 20, 50, 60], 0, 0)).toBeNull();
    expect(boxToPercentRect([10, 20, 50, 60], 100, 0)).toBeNull();
  });

  it('returns null on a malformed box_2d (never fabricates a rectangle)', () => {
    expect(boxToPercentRect([10, 20, 50] as unknown as number[], 100, 200)).toBeNull();
    expect(boxToPercentRect([10, 20, NaN, 60], 100, 200)).toBeNull();
    expect(boxToPercentRect([] as unknown as number[], 100, 200)).toBeNull();
  });
});
