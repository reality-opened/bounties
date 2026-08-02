/*
 * Minimal stand-in for `next/image`'s default export, scoped to exactly the
 * props the 5 tested components pass it (see MotionTracking.tsx): `src`,
 * `alt`, `fill`, `sizes`, `className`. This kit does not install the `next`
 * package at all, so importing "next/image" directly would fail — every
 * component that used it has its import rewired to this file instead (see
 * the "KIT NOTE" comment at each call site).
 *
 * This is NOT a faithful reimplementation of next/image (no optimization,
 * no loader, no layout-shift handling) — it exists purely so the component
 * renders a plain <img> in jsdom and its props are inspectable in tests.
 */
import type { ImgHTMLAttributes } from "react";

export interface StubImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  alt: string;
  /** next/image's "fill" boolean layout mode — not a real <img> attribute. */
  fill?: boolean;
  sizes?: string;
}

export default function Image({
  src,
  alt,
  fill: _fill,
  sizes: _sizes,
  ...rest
}: StubImageProps) {
  // `fill` and `sizes` are next/image-specific layout hints with no plain
  // <img> equivalent; intentionally dropped rather than spread onto the DOM
  // node (spreading `fill` would emit an invalid boolean attribute).
  return <img src={src} alt={alt} {...rest} />;
}
