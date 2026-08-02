# Design brief — landing revamp (hero + information hierarchy)

## The assignment
The marketing site (`apps/landing`) has grown section-by-section (hero →
how-it-works → before/after dataset → benchmark proof → motion QA → capture
comparison → contact) without a single design pass over the whole. This
bounty is that pass, scoped to two things:

1. **The hero** (`app/components/HeroSection.tsx` + `HeroScene.tsx`) — the
   above-the-fold first impression.
2. **Information hierarchy** — the order, weight, and framing of the
   sections that follow it (`LandingExperience.tsx` is the composition
   root), so the page reads as one argument instead of a stack of demos.

**Process, not just output:** before writing any implementation code,
produce a short concept doc proposing **2–3 concrete directions** for the
hero + hierarchy. For each direction, give a one-paragraph description of
what changes and *why* — what problem in the current page it's solving —
plus enough of a sketch (wireframe, annotated screenshot, or just tight
prose) that someone who hasn't stared at this page for months can picture
it. Flag which one you'd pick and why. The founder picks (or redirects) from
that doc; only then do you build the agreed direction as a PR. Submitting an
implementation without a preceding concept doc is treated as skipping the
assignment, not completing it faster.

## House style — constraints, not suggestions
- **Honesty-first metrics.** `app/components/landing/BenchmarkProof.tsx` +
  `proofData.ts` are the reference standard for how this site handles
  numbers: every figure traces to a cited source, wins/ties/losses are all
  shown, and anything not yet measured says so explicitly (see
  `MotionTracking.tsx`'s "validation in progress" metric pills and
  `BeforeAfterDataset.tsx`'s validating section). A revamped hero or
  hierarchy must preserve this: no new metric, stat, or claim that isn't
  already backed by one of the existing data-driven sections. If the new
  design wants a number that doesn't exist yet, it gets an honest
  placeholder state, the same way the rest of the site already does this —
  never an invented figure.
- **Tokens are the palette/type source.** `packages/design/tokens.ts` is
  the single source of truth (color, border, radius, font, type scale);
  `apps/landing/app/globals.css`'s `:root` block is required to stay in
  lockstep with it (`packages/design/__tests__/tokens.test.ts` enforces this
  by reading `apps/landing/app/globals.css` directly — that cross-check is
  why both trees are copied into this kit as siblings, matching their layout
  in the real repo). Pull new colors/type from `tokens.ts`, don't invent
  new hex values or font sizes in a component's CSS module.
- **Both themes.** The site is light/dark via `data-theme` on `<html>`
  (set by the blocking script in `app/layout.tsx`, toggled by
  `ThemeToggle.tsx`, broadcast as the `or-themechange` window event several
  components already listen for — see `CaptureComparison.tsx`'s
  `updateThemeColors()`). Every new/changed surface needs to look
  intentional in both, not just re-skinned dark-mode-as-an-afterthought.
- **Responsive.** Mobile through desktop; the existing sections' CSS modules
  are the pattern for how breakpoints are handled here (media queries local
  to each `*.module.css`, not a separate mobile stylesheet).
- **No fabricated imagery of results.** Where the current site uses an
  illustrative asset (the schematic overlays in `MotionTracking.tsx`, the
  simulated-degradation point clouds in `CaptureComparison.tsx`), it's
  explicitly labeled "Illustrative" / documented as simulated in a code
  comment. Keep that discipline: a hero visual can be illustrative, but it
  cannot *look like* a real benchmark result, product screenshot, or
  customer output if it isn't one.

## Out of scope: auth + `/dashboard`
The signed-in product surface (`app/dashboard/`, `app/api/*`,
`app/onboarding/*`, `middleware.ts`, `ClerkThemeProvider.tsx`) is **not**
part of this revamp — don't touch it, and don't let hero/hierarchy changes
leak into it beyond the shared nav shell in `app/layout.tsx`.

Practically, this app cannot run at all without *some* Clerk key: `app/
layout.tsx` wraps the entire tree in `ClerkThemeProvider` → `ClerkProvider`
unconditionally (there's no "if configured" branch), and the middleware only
protects `/dashboard`, so even `/` needs a valid-shaped publishable key to
boot in dev. No production Clerk credentials are provided in this kit
(`.env.example` lists variable **names** only — see it for the full list).
Two ways to iterate locally without those:
1. **Get your own free Clerk dev instance** (self-serve signup at
   clerk.com, no cost, doesn't touch our account) and put its
   `pk_test_.../sk_test_...` pair in a local `.env.local` per
   `.env.example`. This is the recommended path — it exercises the real
   `ClerkProvider`/`SignInButton`/`UserButton` code paths the hero's nav
   sits next to, with zero risk to production auth.
2. **Stub it out** if you don't want a Clerk account at all: temporarily
   remove the `ClerkThemeProvider` wrapper and the `Show`/`SignInButton`/
   `UserButton` block in `app/layout.tsx` while iterating on marketing-only
   sections (mirrors the `vi.mock("@clerk/nextjs", ...)` already used in
   `test/setup.ts` for the same reason). Revert this before opening a PR —
   auth is out of scope, so the diff shouldn't touch it.

## One more asset note
The hero's point cloud (`/assets/Gaussian_splat.ply`, ~47 MB) is not in git.
`scripts/fetch-hero.sh` pulls it at build time from a **public, tokenless**
mirror (`https://github.com/reality-opened/web-assets/releases/download/v1`
via `WEB_ASSETS_BASE_URL`) if you want the real cloud rendering while you
iterate; without it, `HeroScene.tsx` degrades gracefully (an empty stage,
already-handled in the component, not something you need to build). Either
is fine for this bounty — the revamp's surface is the hero's layout/copy/
composition, not the point-cloud asset itself.

## Inspiration, non-binding
`docs/unmerged-work-notes.md` summarizes two abandoned/unmerged branches
that touched this same territory (a fuller above-the-fold narrative strip,
and a general landing polish pass). Read them for ideas about problems
worth solving — do not copy code or layout from them; they were never
reviewed and aren't a spec.

## If you find something else that needs honesty-scrubbing
This kit has already been checked for client names, personal contact info,
and credentials (see the root README's Ground rules). If you spot copy that
reads as a real customer/partner name, a real metric that isn't sourced, or
anything else that looks like it shouldn't be here — **flag it, don't
silently rewrite it.** Same goes for any other copy change you make for
design reasons: call it out in the PR description rather than changing
wording quietly alongside the visual work.
