# Bounty W6 — Landing revamp (design lead)
**Track:** Web & design · **Access ring:** 2 · **Size:** L (~12 days)

## Context
`apps/landing` is our public marketing site (Next.js 15, App Router):
hero → how-it-works → before/after dataset → benchmark proof → motion QA →
capture comparison → contact, plus a signed-in `/dashboard` that isn't part
of this bounty. It's grown section-by-section and has never had a single
design pass over the hero or the page's overall information hierarchy. This
kit hands over the **entire app**, unmodified except for a few honesty-scrub
fixes (see below), plus `packages/design` — the shared design-token source
the app's `globals.css` is required to stay in lockstep with — so the
revamp has its real palette/type source to work from, not guesses.

This is a **design-lead** bounty: the first deliverable is a short concept
doc (2–3 directions, picked one), not code. See `docs/design-brief.md` for
the full assignment and house-style constraints.

## The task
1. Read `docs/design-brief.md` in full (the assignment) and
   `docs/unmerged-work-notes.md` (inspiration only, non-binding — two
   unmerged branches that attempted related work).
2. Write a concept doc proposing 2–3 directions for the hero + the page's
   information hierarchy, with rationale for each.
3. Once a direction is agreed, implement it as a PR against this app —
   honesty-first metrics preserved, tokens-sourced, both themes, responsive.

## What's in this repo
```
README.md
docs/
  design-brief.md          THE ASSIGNMENT — read this first
  unmerged-work-notes.md    git-log summary of 2 unmerged branches, inspiration only

apps/landing/                = apps/landing, entire tree, with 2 exceptions:
  app/components/landing/contact.ts
                              STUBBED — production hard-codes a real personal inbox here;
                              replaced with hello@example.invalid + a NOTE comment. Same
                              export name/shape, so its 2 importers (HeroSection.tsx,
                              ContactSection.tsx) needed no changes.
  .env.example                one line edited — the Modal URL example encoded a real
                              workspace name; replaced with a placeholder + a NOTE comment.
                              Variable NAMES only, as before — no real keys anywhere.
  (everything else)           byte-identical to production, including app/dashboard/,
                              app/api/*, middleware.ts, Clerk usage, onboarding, e2e specs —
                              all explicitly OUT OF SCOPE for this bounty (see design brief)
                              but left in place since they're part of the real app shell.

packages/design/              = packages/design, entire tree, unmodified. Kept as a SIBLING
                              of apps/landing (not nested under it) deliberately: its own
                              test (__tests__/tokens.test.ts) reads
                              ../../../apps/landing/app/globals.css by relative path to check
                              the two stay in lockstep, and that path only resolves if the two
                              trees keep the same relative layout they have in the real repo.
                              No relative dependency path needed fixing — apps/landing doesn't
                              actually import @reality/design as a package (see landing's own
                              CLAUDE.md: "Independent — uses no shared packages"); the tokens
                              are consumed as manually-mirrored CSS custom properties in
                              globals.css, which is exactly what that test enforces.
```

**Security scrub performed:** this repo was checked against our standard
pre-handoff pattern (internal project codenames, personal names/handles, and
personal email addresses) and returns zero hits. The only two matches found
in the source before the scrub were the `contact.ts` email and the
`.env.example` Modal URL, both fixed above (see each file's NOTE comment for
exactly what changed and why).

## Acceptance criteria
- A concept doc with 2–3 directions + rationale, submitted and agreed
  **before** implementation.
- An implemented PR for the agreed direction: responsive, both themes,
  colors/type sourced from `packages/design/tokens.ts` (or `globals.css`'s
  token-mirrored custom properties), zero fabricated metrics anywhere on the
  page.
- Any copy change — wording, numbers, claims — is called out explicitly in
  the PR description, never made silently alongside the visual work.
- `/dashboard`, `/api/*`, onboarding and Clerk wiring are untouched (beyond
  the shared nav shell in `app/layout.tsx`, if the agreed direction touches
  it).

## Getting started
This repo consumes its packages independently (no npm-workspace hoisting —
mirrors how the real monorepo does it):
```bash
npm --prefix apps/landing install
npm --prefix apps/landing run dev
```
`packages/design` has its own install/test if you want to run its parity
check locally:
```bash
npm --prefix packages/design install
npm --prefix packages/design test
```

**Honesty note:** this scaffold was assembled offline; neither `install` has
been run against it here — treat the above as untested. If something
doesn't resolve once you install, fixing the scaffold is in-scope and
appreciated; flag what you fixed in the PR description.

**Before you can see the page at all:** `app/layout.tsx` wraps the whole
app in Clerk's `ClerkProvider`, unconditionally — `npm run dev` will not
boot without a Clerk publishable key. `docs/design-brief.md`'s "Out of
scope: auth" section covers your two options (get a free personal Clerk dev
instance, or temporarily stub `@clerk/nextjs` while iterating) — read that
before you get stuck on a Clerk error on your first `next dev`.

**The hero's point cloud** (`public/assets/Gaussian_splat.ply`, ~47 MB) isn't
in git and isn't fetched by `npm install`; `scripts/fetch-hero.sh` can pull
it from a public, tokenless mirror (see the script + the design brief) if
you want it, or just run without it — `HeroScene.tsx` already degrades
gracefully with an empty stage.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
