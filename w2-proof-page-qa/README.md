# Bounty W2 — Benchmark-proof page: design + accessibility QA
**Track:** Web & design · **Access ring:** 2 · **Size:** S (~2 days)

## Context
This is a public benchmark-honesty page: a `/proof` writeup and a landing
`BenchmarkProof` section, both fully data-driven from one typed data module
(no hardcoded numbers in markup) and scoped to public robot datasets only. No
customer or client data appears anywhere in it. The pass being bountied is
design + accessibility QA on the markup and styling — not on the numbers or
the wording.

## The task
Audit and fix the `/proof` page and the benchmark section: table semantics
(proper `th`/`scope`/caption), keyboard navigation and focus states,
responsive figure grid at mobile/tablet/desktop, dark/light plate handling,
heading hierarchy, alt text.

## What's in this repo
A minimal, standalone Next.js (App Router) scaffold containing **only** the
two routes in scope and their exact import graph — nothing else from the
production site.

```
app/
  layout.tsx              minimal html/body shell: the 3 landing fonts (next/font/google)
                           + globals.css + the dark/light theme-init script (kit-only addition,
                           see the note in the file — without it dark mode can never activate)
  page.tsx                kit-only index, links to /proof and /section
  globals.css             copied verbatim from apps/landing (design tokens, .container,
                           .landing-section etc. that BenchmarkProof relies on)
  proof/
    page.tsx               = apps/landing/app/proof/page.tsx, byte-identical
    proof.module.css        = apps/landing/app/proof/proof.module.css, byte-identical
  section/
    page.tsx                kit-only: renders <BenchmarkProof /> standalone
  components/landing/
    BenchmarkProof.tsx       = apps/landing/app/components/landing/BenchmarkProof.tsx, byte-identical
    BenchmarkProof.module.css = same, byte-identical
    proofData.ts             = same, byte-identical (all copy/numbers; DO NOT edit, see Ground rules)
public/proof/*.png          6 placeholder images — see PLACEHOLDERS.md
```

**No stubbing was needed.** `/proof` and `BenchmarkProof` have zero Clerk/auth
imports and no dependency on any other app component — their only local
import is `proofData.ts` (a plain data module with no imports of its own), so
every file above is copied unedited except the two kit-only additions
(`app/page.tsx`, `app/section/page.tsx`) and `app/layout.tsx`, which is
deliberately trimmed to a bare shell per the kit brief.

**Not included:** `packages/design/tokens.ts` (the shared design-token
source). Neither page imports it — `globals.css`'s `:root` custom properties
are the actual source consumed here, and they're copied in full — so it was
read for reference only, per the kit brief, and isn't part of this repo.

## Acceptance criteria
- axe DevTools (or `@axe-core/cli`) reports zero violations on both routes.
- Fully keyboard-navigable with visible focus.
- Before/after screenshots at 360px, 768px, 1280px for both routes.
- A short findings note (what was wrong, what you changed, anything you
  flagged but didn't change).
- Copy/data changes are NEVER made silently — flag any wording or number
  concern in the findings note instead.

## Getting started
```
npm install && npm run dev
```
— note: this scaffold was assembled offline and the build has not been
executed here; if anything fails to compile, fixing the scaffold is in-scope
and appreciated (flag what you fixed). One thing worth knowing going in: the
three fonts in `app/layout.tsx` are `next/font/google` (Newsreader, Hanken
Grotesk, IBM Plex Mono) — like the production app, `next dev`/`next build`
fetches these at build time, so the build needs outbound network access once.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in
  progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and
  report it — that's a bug on our side, and worth credit.
