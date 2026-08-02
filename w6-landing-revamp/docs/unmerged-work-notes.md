# Unmerged work notes — inspiration only, non-binding

This note summarizes two branches on the `web` repo's remote that touched
landing-page territory but were never merged to `main`. They were inspected
read-only (`git log --stat`) for this kit — **no code from either branch is
copied into this repo**, and neither represents an agreed direction. Treat
them purely as "here's what was tried before and roughly why," useful
context when you're proposing your own 2–3 directions in
`docs/design-brief.md`, not a spec to continue or a design that was already
approved.

## `origin/feat/fullloop-landing` (1 commit ahead of `main`)
A single, self-contained commit that **extends** the already-merged
benchmark-proof section (doesn't replace it) with two new above-the-fold /
mid-page pieces:

- **`LoopStrip`** — a five-stage narrative strip (Scan → Reconstruct →
  Detect → Refine → Export) meant to sit near the top of the page, reusing
  the rail/packet visual language already established in `HowItWorks.tsx`.
  Its positioning line frames the product as "closing the real→sim→real gap
  with accurate geometry" via 4D capture + Gaussian splats. Notably careful
  about scope of claims: the Export stage names the three real formats the
  product supports today, phrased as "designed so new ones slot in" rather
  than implying it already handles every future format.
- **`ResultsBand`** — a card pair meant to sit under the existing
  benchmark-proof section: one recapping the already-measured "why it
  trains better" result, and a second for a **not-yet-run** experiment
  ("and it executes"), wired to a single results data module that starts in
  an explicit pending state (a status flag, flipped to final only once real
  numbers exist) — the same honesty pattern the rest of the site already
  uses for unmeasured claims. It also included a placeholder for pilot
  footage ("coming") rather than a fabricated clip.
- Smaller supporting changes: the hero-asset fetch script was extended to
  best-effort pull an additional demo clip/poster for the second card
  (expected to 404 until published, non-fatal to the build), with the new
  file ignored in git the same way the existing large hero asset is.

Apparent intent: broaden the page's proof surface with a fuller pipeline
narrative up top and a second, execution-focused results card below the
existing benchmark section — while keeping the same "no number without a
source, explicit pending state until then" discipline as the shipped
`BenchmarkProof`/`proofData.ts` pattern in this kit.

## `origin/wip/landing-polish` (10 commits ahead of `main`)
Only the **tip commit** on this branch touches the landing app; the other
nine are earlier, unrelated `webserver`/protocol work (object-layer
rendering, a six-stage product-workflow scaffold) that this branch happened
to fork from and carries in its history — out of scope for this note.

The relevant commit is an explicit **rescue snapshot**: its message says it
captures uncommitted working-tree edits found on another integration branch,
with intent "not yet reviewed" and the instruction to "amend or reorganize
freely." There is no design rationale recorded — what follows is inferred
purely from the diff shape, not a stated goal.

Files touched, by size of change: `app/globals.css` is by far the largest
(nearly 400 lines added), suggesting a substantial token/utility-class
expansion at the global level. `HeroSection.tsx` and its CSS module were
both heavily rewritten (dozens of lines each), pointing at the hero as the
main visual target. Lighter touch-ups ripple into `HeroScene.tsx`,
`ThemeToggle.tsx`, `LandingExperience.tsx`, `FinalCta.tsx`, `HowItWorks.tsx`
(+ its module), `MotionTracking.module.css`, `ScenesShowcase.tsx`,
`SpatialAgentDemo.module.css`, `layout.tsx`, and `app/proof/page.tsx` — a
handful of lines in each, consistent with a broad "make everything agree
with the new hero/global changes" pass rather than independent redesigns of
each section.

Apparent intent: a hero-focused visual pass that grew into a wider,
unreviewed styling sweep across most of the landing page's sections and its
global stylesheet.

## Using these
Both branches suggest real problems worth considering — a richer top-of-page
narrative, a second execution-proof result, a heavier hero treatment — but
neither was reviewed, tested against the house-style constraints in
`docs/design-brief.md`, or approved. Cite the *problem* they were reaching
for in your concept doc if it's relevant; don't port their components or
CSS wholesale.
