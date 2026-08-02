/**
 * Extracted from the platform's cross-repo protocol contract (`web/packages/protocol/types.ts`)
 * for this bounty kit. Only the pieces needed for the mask-overlay task are included: the 2D
 * detection box type, the run-length-encoded mask type, and their hand-written type guards.
 *
 * These are intentionally kept byte-for-byte compatible with the real contract so code written
 * against this file drops into the real `@reality/protocol` package unchanged.
 */

/** `[x0, y0, x1, y1]` in pixels on the source keyframe. */
export type Box2D = number[];

/**
 * Compact run-length-encoded mask: row-major ("C" order) runs, alternating, starting with a
 * `False` run. See `docs/rle-format.md` in this kit for the full encoding spec with worked
 * examples — this mirrors the server's encoder exactly.
 */
export interface MaskRLE {
  size: [number, number];
  counts: number[];
  order: 'C';
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Hand-written guard (never throws) for the optional `box_2d` field. */
export function isBox2D(value: unknown): value is Box2D {
  return Array.isArray(value) && value.length === 4 && value.every(isFiniteNumber);
}

/** Hand-written guard (never throws) for the optional `mask_rle` field. */
export function isMaskRle(value: unknown): value is MaskRLE {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    Array.isArray(o.size) &&
    o.size.length === 2 &&
    o.size.every(isFiniteNumber) &&
    Array.isArray(o.counts) &&
    o.counts.every(isFiniteNumber) &&
    o.order === 'C'
  );
}
