import type { Box2D } from './protocolTypes';

/**
 * Pure geometry for the Detect-stage 2D detection overlay.
 *
 * A real SAM `box_2d` (`[x0, y0, x1, y1]` in pixels on the source keyframe) is scaled to a
 * PERCENTAGE rect relative to the keyframe's natural pixel size. Percentages let the rectangle
 * overlay a responsively-sized `<img>` thumbnail without knowing its rendered dimensions, and
 * stay correct if the thumbnail is later resized by CSS. Nothing here fabricates a box: an
 * unknown natural size or a malformed `box_2d` returns null and the caller draws nothing.
 *
 * This is the SHIPPED reference pattern for `src/maskOverlay.ts` in this kit — same percentage-
 * rect approach, same "never fabricate, return null/no-op on bad input" discipline.
 */

export interface PercentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clampPct = (v: number): number => Math.min(100, Math.max(0, v));

/** Scale a pixel-space `box_2d` to a `%`-rect of the keyframe's natural size. Corner order is
 *  normalized (min/max, so a flipped box still draws), and every edge is clamped to [0, 100]%.
 *  Returns null when the natural size is unknown (0/negative) or `box_2d` is malformed. */
export function boxToPercentRect(box: Box2D, naturalW: number, naturalH: number): PercentRect | null {
  if (!(naturalW > 0) || !(naturalH > 0)) return null;
  if (!Array.isArray(box) || box.length !== 4 || !box.every((n) => Number.isFinite(n))) return null;

  const x0 = Math.min(box[0], box[2]);
  const x1 = Math.max(box[0], box[2]);
  const y0 = Math.min(box[1], box[3]);
  const y1 = Math.max(box[1], box[3]);

  const left = clampPct((x0 / naturalW) * 100);
  const top = clampPct((y0 / naturalH) * 100);
  const right = clampPct((x1 / naturalW) * 100);
  const bottom = clampPct((y1 / naturalH) * 100);

  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
