import type { MaskRLE } from './protocolTypes';
import type { PercentRect } from './detectionBox';

/**
 * THIS FILE IS THE BOUNTY. Both functions below are stubs — implement them.
 *
 * The Detect stage renders 2D evidence boxes over keyframe thumbnails (see `src/detectionBox.ts`
 * for the shipped, working pattern) but has no way to render segmentation masks, even though the
 * protocol already types them (`src/protocolTypes.ts`: `MaskRLE` + `isMaskRle`). Your job is to
 * decode the RLE and composite it as a translucent overlay on a canvas, mirroring the discipline
 * of `boxToPercentRect`: never fabricate output, fail predictably on bad input.
 *
 * See `docs/rle-format.md` for the exact encoding (with worked examples) and `fixtures/*.json`
 * for encoded/decoded oracle pairs to test against — including one deliberately-invalid encoding.
 */

/**
 * Decode a run-length-encoded segmentation mask into a dense pixel buffer.
 *
 * Chosen return shape: a flat `Uint8Array` of length `mask.size[0] * mask.size[1]`, one byte per
 * pixel, in the SAME row-major ("C") order as the encoding — index `row * W + col`. Each byte is
 * `0` (pixel not in mask) or `1` (pixel in mask). (An `ImageData`-shaped return is also a
 * reasonable design — if you change it, update this doc comment and README to match, and update
 * `drawMaskOverlay` accordingly.)
 *
 * Must never return a buffer whose length disagrees with `size[0] * size[1]`, and must never
 * silently truncate or pad bad input. Reject anything that fails the `isMaskRle` guard, or whose
 * `counts` don't sum to exactly `size[0] * size[1]`, with a thrown error (a `TypeError` is a
 * reasonable choice) rather than returning a partial/zeroed buffer — callers need to be able to
 * tell "decoded, but empty" apart from "failed to decode".
 *
 * @param mask - A `MaskRLE` as received over the protocol (`DetectionResult.mask_rle` /
 *   `SceneEvidenceRef.mask_rle`).
 * @returns Flat row-major 0/1 buffer, `size[0] * size[1]` bytes long.
 * @throws If `mask` is malformed or internally inconsistent.
 */
export function decodeMaskRle(mask: MaskRLE): Uint8Array {
  throw new Error('bounty: implement');
}

/** Overlay rendering options. All optional; document your chosen defaults when you implement. */
export interface DrawMaskOverlayOptions {
  /** RGB color for masked pixels, 0-255 per channel. */
  color?: [number, number, number];
  /** Overlay opacity, 0 (invisible) to 1 (opaque). */
  alpha?: number;
}

/**
 * Composite a decoded mask as a translucent overlay onto a canvas 2D context, positioned at
 * `rect` (a `PercentRect` of the *canvas's own* size — see `boxToPercentRect` in
 * `src/detectionBox.ts` for how a `PercentRect` is normally produced from a `Box2D`).
 *
 * Expectations (mirroring `boxToPercentRect`'s "never fabricate" discipline):
 * - A mask whose pixel dimensions (`mask.size`) don't match `rect`'s pixel footprint on the
 *   canvas should still render — scale/resample as needed. Document whatever resampling
 *   strategy you pick (nearest-neighbor is fine for a first pass).
 * - A missing or invalid mask (fails `isMaskRle`, or `decodeMaskRle` throws) must NOT throw out
 *   of this function and must NOT silently draw something misleading (e.g. a stale/garbage
 *   buffer) — decide on and document one explicit behavior (e.g. draw nothing and return, or
 *   draw a clearly-marked "no mask" hatch) and be consistent.
 * - An oversized mask (e.g. `size` far larger than the canvas) must not throw or hang; clip to
 *   the canvas bounds.
 *
 * @param ctx - Destination 2D canvas context.
 * @param mask - The `MaskRLE` to render.
 * @param rect - Destination rectangle, in percent of the canvas's own width/height.
 * @param opts - Optional color/alpha overrides.
 */
export function drawMaskOverlay(
  ctx: CanvasRenderingContext2D,
  mask: MaskRLE,
  rect: PercentRect,
  opts?: DrawMaskOverlayOptions
): void {
  throw new Error('bounty: implement');
}
