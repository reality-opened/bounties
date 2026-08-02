import { describe, expect, it } from 'vitest';
import {
  base64ColorsToFloat32,
  base64ToFloat32Array,
  bytesToBase64 as protoBytesToBase64,
  concatFloat32Arrays,
} from '../binary';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const btoaFn = (globalThis as { btoa?: (input: string) => string }).btoa;
  if (typeof btoaFn === 'function') {
    return btoaFn(binary);
  }

  const buffer = (globalThis as unknown as {
    Buffer?: { from(input: string, encoding: 'binary'): { toString(encoding: 'base64'): string } };
  }).Buffer;
  if (!buffer) {
    throw new Error('No base64 encoder is available in this runtime.');
  }
  return buffer.from(binary, 'binary').toString('base64');
}

describe('binary payload helpers', () => {
  it('decodes base64 float32 point buffers', () => {
    const points = new Float32Array([1, -2.5, 3.25, 4, 5.5, -6]);
    const decoded = base64ToFloat32Array(bytesToBase64(new Uint8Array(points.buffer)));

    expect(Array.from(decoded)).toEqual(Array.from(points));
  });

  it('decodes uint8 colors into normalized float colors', () => {
    const decoded = base64ColorsToFloat32(bytesToBase64(new Uint8Array([0, 128, 255])));

    expect(decoded[0]).toBe(0);
    expect(decoded[1]).toBeCloseTo(128 / 255, 6);
    expect(decoded[2]).toBe(1);
  });

  it('concatenates float32 arrays without changing order', () => {
    const combined = concatFloat32Arrays([
      new Float32Array([1, 2]),
      new Float32Array([3]),
      new Float32Array([4, 5]),
    ]);

    expect(Array.from(combined)).toEqual([1, 2, 3, 4, 5]);
  });

  it('bytesToBase64 round-trips through the float32/color decoders', () => {
    const points = new Float32Array([1, -2.5, 3.25, 4, 5.5, -6]);
    expect(Array.from(base64ToFloat32Array(protoBytesToBase64(new Uint8Array(points.buffer))))).toEqual(
      Array.from(points),
    );
    const decodedColors = base64ColorsToFloat32(protoBytesToBase64(new Uint8Array([0, 128, 255])));
    expect(decodedColors[0]).toBe(0);
    expect(decodedColors[2]).toBe(1);
  });

  it('bytesToBase64 handles a large array without a stack overflow', () => {
    const big = new Uint8Array(200_000).map((_v, i) => i % 256);
    const decoded = base64ColorsToFloat32(protoBytesToBase64(big));
    expect(decoded.length).toBe(big.length);
    expect(decoded[255]).toBeCloseTo(255 / 255, 6);
  });
});
