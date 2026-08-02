# Bounty W4 — Product SPA tokenization — pilot page

**Track:** Web & design · **Access ring:** 2 · **Size:** M (~5 days)

## Context

OpenReality's main product frontend (`apps/webserver`, a Vite + TypeScript SPA) predates
`@reality/design`, the package that's supposed to be the single source of truth for color/type/
spacing across the whole frontend ("surveyor's instrument" look — warm paper, ink, one teal
accent). Instead, most of the SPA's pages declare their own hand-copied `:root` block of raw hex/
rgba values that happen to *resemble* the shared tokens (sometimes exactly, sometimes off by a
shade) but aren't actually wired to them. If a token changes, every page has to be found and
edited by hand — the opposite of the point of having a tokens package.

This kit is a **pilot**: one page, migrated end-to-end, to prove out the pattern (and the
tooling) before it's rolled out SPA-wide.

## Which page, and why

The brief for this kit originally scoped the pilot to the **summary/report page**
(`summary.html` / `src/summary.ts` / `src/sceneReportView.ts`). On inspection, that page imports
`SLAMConnection` — the live Socket.IO client that streams scan data from the backend — end to
end: connection lifecycle, live chat via a real `fetch` to an assistant endpoint, a CLIP+SAM3
detection-debug pipeline, and PLY export off a live in-memory snapshot. Getting that onto static
fixtures cleanly would mean re-implementing a meaningful slice of the socket protocol as mocks,
which is disproportionate to a CSS-tokenization pilot.

So, per the brief's documented fallback, **this kit instead scopes to the Refine stage of the
six-stage workflow page** (`apps/webserver/src/workflow/stages/refine.ts` + the `.wf-*` rules in
`workflow.css`). Refine was picked over Detect (the other fallback option) because:

- Refine's real component is **already written to degrade gracefully without a live 3D viewer** —
  its "free-form 3D pick" anchor mode is simply disabled when there's no `SceneManager` instance
  (`canFreePick = !!ctx.sceneManager`), and its two real actions (auto-clamp, metric-anchor) are
  driven by two clean `POST` REST calls, easy to mock.
- Detect, by contrast, needs authenticated keyframe image URLs (`<img>` tags hitting a
  `?auth_token=` route) to render its 2D detection-box evidence thumbnails, and its "AI-completed
  3D asset overlay" needs the shared viewer outright.

`src/refineStage.ts` is an **adaptation** of the real `refine.ts`, not a byte-for-byte copy — see
that file's header comment for the exact list of what was kept (findings list, auto-clamp,
metric-anchor via detected-object centers, the honest numeric before/after) and dropped (the
free-form 3D pick mode, the post-action "show in viewer" render, the six-stage stepper chrome —
all three need the live `SceneManager`/Three.js viewer this kit intentionally doesn't include).
Markup structure and CSS class names match the production stage exactly, so the CSS you're
tokenizing is representative of the real thing.

## The task

Tokenize this page's CSS (`src/styles/refine.css`) onto `@reality/design`'s tokens
(`design/tokens.ts`), via `toCssRoot()` / CSS custom properties:

- The result should be **visually identical** to the current page (or an *improved* look, with
  your reviewer's approval before you ship it — don't silently redesign).
- **All colors, type, and spacing should come from the shared tokens** — no more hard-copied hex/
  rgba. Read `src/styles/refine.css`'s header comment first: it points out exactly which values
  duplicate `design/tokens.ts` values already (some identically, some by a shade), which is the
  drift you're removing.
- You'll likely want a build step (or a small script) that turns `design/tokens.ts`'s
  `toCssRoot()` into an actual `:root { ... }` block the page imports/links — that's an
  intentionally open design decision; document whatever you pick.
- The **honesty caveat below about the dev scaffold** is real work, not a footnote — read it.

## What's in this repo

```
README.md
package.json, tsconfig.json          minimal, hand-written for this kit (not copied from the app)
vite.config.ts                       MINIMAL vite config, hand-written — see below
refine.html                           the pilot page's HTML entry
src/
  refine.ts                            entry point: mounts the fixture scene into #app
  refineStage.ts                       the adapted Refine-stage render logic (see "Which page" above)
  types.ts                             kit-local trimmed mirror of the real @reality/protocol
                                        response/scene shapes this page reads (see file header)
  util.ts                              escapeHtml, copied verbatim from sceneReportView.ts
  fixtures/demoScene.ts                 the fixture "scene" data the page renders (fully invented)
  styles/refine.css                    THE FILE YOU'RE TOKENIZING — current state: a hand-copied
                                        :root of raw hex/rgba + the Refine-scoped .wf-* rules,
                                        trimmed from the real summary.css (1075 lines) + workflow.css
                                        (646 lines) down to only what this page renders
mock/apiMock.ts                       hand-written Vite dev-server plugin mocking ONLY the two
                                       REST routes this page calls (POST .../clamp, .../anchor) —
                                       NOT a copy of apps/webserver/vite.config.ts's much larger
                                       apiMockPlugin (which has 12 HTML entrypoints' worth of
                                       routes and client-name fixture comments — see below)
design/                               packages/design, COPIED FULL (this kit's actual tokens
                                       source of truth)
  tokens.ts, index.ts                   unchanged
  __tests__/tokens.test.ts              ADAPTED — see "design/ tokens test" below
  __tests__/fixtures/landing-globals-root.css   NEW — fixture the adapted test reads
scripts/check-no-raw-colors.mjs       lint script enforcing the acceptance bar (see below);
                                       currently FAILS against src/styles/refine.css (8 hits) —
                                       that's the starting state, not a bug in the script
```

### Why the vite config and API mock are hand-written, not copied

`apps/webserver/vite.config.ts` is NOT copied wholesale into this kit — per the bounty brief, it
contains client-name comments (in `synthDemoScene`'s doc comment and the object-layer fixture
plugin's doc comment) and a much bigger surface (12 HTML build entrypoints, an HTTPS dev cert,
`three`/`socket.io-client` optimizeDeps, an object-layer static-fixture server) than this
one-page kit needs. `vite.config.ts` and `mock/apiMock.ts` here are written from scratch,
extracting only the `clamp`/`anchor` mock-route *behavior* (reimplemented, not copied) with
fully generic sample data.

### `design/` tokens test

`packages/design/__tests__/tokens.test.ts` (the real file) reads
`../../apps/landing/app/globals.css` to check the landing app's `:root` hasn't drifted from
`tokens.ts`. That app isn't part of this kit, so `design/__tests__/tokens.test.ts` here instead
reads a **fixture-ized copy** of just that file's `:root` block:
`design/__tests__/fixtures/landing-globals-root.css` (captured verbatim at kit-assembly time).
The test's assertions are otherwise unchanged — same parity check, same `toCssRoot()` smoke test.

## Acceptance criteria

- **Before/after screenshots**, taken by you, of `refine.html` running against the mock backend —
  before you start, and after tokenization.
- **A diff of `src/styles/refine.css`** showing the token adoption (raw values → `var(--...)`).
- **Zero remaining raw color literals** in the page's CSS, enforced by
  `node scripts/check-no-raw-colors.mjs` (wired as `npm run lint:colors`). Right now this FAILS
  (8 hits) — get it to exit 0.
- **The page renders on the mock backend** with `npm run dev` (visit `/refine.html`).

## Getting started

**Honesty note:** this kit was assembled without running `npm install` or `npm run dev` —
nothing in it has been executed end-to-end. The wiring below (dependencies, the Vite alias for
`@reality/design`, the mock plugin's routes) is believed correct but **unverified** — treat
getting the dev scaffold actually running as real, in-scope work for this bounty, not a solved
prerequisite. If something doesn't wire up cleanly, fix it and note what was wrong; that's
useful signal for the next pilot page.

```bash
npm install            # pulls in @reality/design via the file: dep, plus vite/typescript
npm run lint:colors     # confirm the starting-state failure (8 raw color literals)
npm run dev             # visit http://localhost:3000/refine.html
```

Do the tokenization work in `src/styles/refine.css` (and wherever you land the generated
`:root` from `design/tokens.ts`'s `toCssRoot()`), then re-run `npm run lint:colors` until clean,
and take your before/after screenshots.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
