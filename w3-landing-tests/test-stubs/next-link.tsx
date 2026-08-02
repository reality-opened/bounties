/*
 * Minimal stand-in for `next/link`'s default export, scoped to exactly the
 * props the 5 tested components pass it (see BenchmarkProof.tsx): `href`,
 * `className`, `children`. This kit does not install the `next` package at
 * all, so importing "next/link" directly would fail — every component that
 * used it has its import rewired to this file instead (see the "KIT NOTE"
 * comment at each call site).
 *
 * This is NOT a faithful reimplementation of next/link (no client-side
 * routing, no prefetch) — it renders a plain <a>, which is sufficient for
 * asserting the link is present and points at the right href.
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface StubLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children?: ReactNode;
}

export default function Link({ href, children, ...rest }: StubLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
