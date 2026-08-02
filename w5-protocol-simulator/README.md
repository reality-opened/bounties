# Bounty W5 — Protocol simulator package

**Track:** Web & design · **Access ring:** 2 · **Size:** M (~3.5 days)

## Context

OpenReality's frontends (the Vite SPA in `apps/webserver`, plus the React Native app in
`apps/mobile`) talk to a Python streaming server over a mix of Socket.IO events and REST
routes. That contract — event names, payload shapes, REST paths, auth, the binary frame
protocol — is versioned as its own package, `@reality/protocol`, so both frontends (and the
server's Python mirror of it) stay in lockstep.

To develop and test frontend code without booting the real GPU-backed server, the mobile app
has a small **test harness**: a Socket.IO + HTTP mock server that replays a handful of canned
JSON fixtures (a full SLAM update, two incremental updates, a ready scene report) instead of
running real SLAM. It works, but it's a developer-only implementation detail buried inside
`apps/mobile/test-harness/` — no CLI, no docs, no way to switch between fixture scenarios, and
no standalone way to point *any* client at it (web, a script, a curious teammate) without
reading its source.

This kit lifts that harness out into a real, documented, reusable package: a **protocol
simulator** anyone building against the OpenReality contract can run standalone.

## The task

Turn `harness/` into a **standalone, documented simulator package**:

1. **CLI entry.** A runnable entry point (`npm start`, a `bin` script, whatever's idiomatic)
   that accepts at least:
   - `--port <n>` (or `PORT` env, matching the existing `mock-server/index.ts` convention)
   - a scenario flag to pick which canned fixture set drives the session
2. **Scenario switching.** The harness currently always replays the same fixtures in the same
   order (`fullUpdate` on `start_slam`, `incrementalOne` + the scene report on `frame`, etc. —
   see `harness/mock-server/index.ts`). Turn the three canned fixture sets into selectable
   scenarios:
   - `full` — a single full `slam_update` (`fixtures/slam_update.full.json`)
   - `incremental` — the incremental-update sequence (`fixtures/slam_update.incremental-1.json`,
     `slam_update.incremental-2.json`)
   - `scene_report` — jumps straight to a ready `scene_report` (`fixtures/scene_report.ready.json`)
   A caller should be able to pick one at start time (CLI flag / env var — your call) and get a
   session driven by *that* scenario, not always the same hardcoded path.
3. **A README** (inside `harness/` or wherever you land the package) documenting **every**
   simulated socket event and REST route — see the acceptance table below for the shape we
   want.
4. **One sample consumer** — a tiny HTML page or a small Node/TS script that connects to the
   running simulator (socket + REST), drives a session, and logs the event flow to the
   console (connect → start_slam → slam_update(s) → scene_report → disconnect, or similar).
   This is the "does it actually work end-to-end" proof, and doubles as a usage example for
   whoever picks this package up next.

You have full latitude on package shape (a `bin/` script + `package.json.bin`, a plain
`node harness/cli.ts`, etc.) — pick whatever's cleanest, and explain the choice in your README.

## What's in this repo

```
harness/                    the mobile app's test harness, copied verbatim (starting point)
  mock-server/index.ts         Socket.IO + HTTP mock server — REST_PATHS + CLIENT_EVENTS/
                                SERVER_EVENTS from @reality/protocol, replays the fixtures below
  capture-fixtures.ts           script to re-capture fixtures from a live Modal worker (needs
                                 real credentials — not runnable in this kit, kept for reference)
  fixtures/*.json                the four canned payloads mock-server replays
  __tests__/mock-contract.test.ts  existing vitest coverage of the mock server's own contract
  package.json, tsconfig.json, vitest.config.ts   NEW — added in this kit (see below)
protocol/                   FULL copy of packages/protocol (@reality/protocol), incl. __tests__
                            — the contract itself: socket events, REST paths, auth, binary frame
                            (de)coding, object-layer conversion. This is what the simulator
                            simulates; treat it as read-only ground truth unless the task
                            genuinely requires extending the contract.
README.md                  this file
```

### Fixing the `@reality/protocol` import

The original harness lives inside the `web` monorepo and resolves `@reality/protocol` via a
sibling-package path (`../../packages/protocol`) declared in the mobile app's `package.json`
(`"@reality/protocol": "file:../../packages/protocol"`) and `tsconfig.json` (`paths`). Outside
that monorepo, that path doesn't exist — so this kit rewires both to point at **this kit's own
copy**, `./protocol` (sibling of `harness/`), instead:

- `harness/package.json` — `"@reality/protocol": "file:../protocol"`
- `harness/tsconfig.json` — `"paths": { "@reality/protocol": ["../protocol/index.ts"] }`
- `harness/vitest.config.ts` — `resolve.alias` pointing at `../protocol/index.ts`

`harness/mock-server/index.ts` and `harness/__tests__/mock-contract.test.ts` themselves are
**unmodified** — they still just `import { ... } from '@reality/protocol'`; only the resolution
target changed. If you reshape the package (e.g. move `harness/` up a level, or merge it with
`protocol/` into one `package.json`), keep this alias correct.

### Scrub note (why a couple of comments/strings look edited)

Per the standing rule that no client names or credentials ever land in a public-facing repo,
two known-hit spots inside `protocol/` were rewritten before this kit was assembled (both are
comments or test literals — no logic changed):

- `protocol/rest.ts` (embed-delivery comment) — a client-pilot name in a comment was replaced
  with the word "client".
- `protocol/types.ts` (`PersistedScene.client`/`.project` docstring example) — the example
  values were replaced with `client="acme"`, `project="rooftop"`.
- `protocol/__tests__/rest.test.ts` — `PROJECTS_MANIFEST`/`buildBuildingUrl` test literals used
  a real pilot's client/project name; replaced with `'acme'` / `'rooftop'` (same assertions,
  same shape, just different placeholder strings).
- `protocol/__tests__/objectLayer.test.ts` — a fixture `scan_id` and a comment referenced a
  client name; replaced with `'demo_walkthrough'` and generic wording.

None of this changes any exported behavior — every test still asserts the same thing against
the same function, just with placeholder strings instead of a real pilot's name.

## Acceptance criteria

- **One-command start.** `npm start` (or equivalent) boots the simulator with no other setup
  beyond `npm install`.
- **Scenario switching works.** All three canned scenarios (`full`, `incremental`,
  `scene_report`) are selectable and each drives a visibly different session.
- **Every simulated socket event + REST route is documented in a table.** One row per event/
  route: name, direction (client→server / server→client / REST verb+path), when it fires,
  payload shape (or a pointer to the `@reality/protocol` type that defines it). Cross-check
  against `harness/mock-server/index.ts` — every `socket.on(...)`, `socket.emit(...)`, and
  `if (request.method === ... && url.pathname === REST_PATHS...)` branch should have a row.
- **`protocol/`'s own tests stay green.** `npm test` inside `protocol/` should still pass after
  any changes you make elsewhere in the kit (you shouldn't need to touch `protocol/` at all for
  this task — it's the contract, not the thing being built).
- **The sample consumer demonstrates a full session flow** — connect, drive a scenario to
  completion, disconnect — with each step visibly logged.

## Getting started

This kit was assembled without running `npm install` or any build, so **nothing has been
executed or verified end-to-end** — treat the wiring above as "should work," not "confirmed
working," and budget time to fix whatever doesn't.

```bash
cd harness
npm install          # pulls in @reality/protocol via the file: dep above, plus socket.io(-client)
npm run mock-server  # sanity-check the UNMODIFIED harness still boots before you touch anything
npm test             # existing mock-contract.test.ts coverage

cd ../protocol
npm install
npm test             # confirm the contract's own tests are green before you build on top of it
```

From there, build the CLI/scenario-switching/docs/sample-consumer inside (or alongside)
`harness/` per **The task** above.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
