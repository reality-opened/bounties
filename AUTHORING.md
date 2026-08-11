# Writing a bounty — internal authoring guide

Operator-side. Never shared with contributors. Companion to `README.md` (which is the
*publishing* run-book); this file is the *authoring* rules — what a bounty is, how to write one,
and how to land it on the board.

Doctrine here reflects the founder's board rewrite of **2026-08-09** (web `1cc9eb4`), which moved
the program away from the 2026-07-28 airlock framing. Where the two disagree, this file wins.

---

## What changed on 2026-08-09 (read this before reusing an old bounty as a template)

| Was (2026-07-28) | Is now |
|---|---|
| Every bounty is an isolated kit repo; "you never need (or get) the full codebase" | A bounty is **either** a standalone kit repo **or** a scoped contribution directly to an existing repo |
| Rings = a **trust ladder**, earned by accepted work | Rings = a **complexity indicator**. They no longer promise or withhold access |
| One active bounty per person | **Several people may work one bounty.** A claim is not a reservation |
| Questions on the PR, *not* in DMs | PR **and** DMs both fine |
| Acceptance criteria are "the contract" | Criteria are stated, then the work and results are **discussed together** |
| Credit = co-author trailer, next bounty one ring up | Credit is its own step, and **payment should be attached to each bounty** (model still undecided) |
| Ground rules: no secrets ever / materials private + IP agreement / honest numbers / report leaks | Ground rules: materials private (much will be opened in time) / keep numbers objective / **contributors may post their own bounties** |
| Board is unlisted, "don't share the URL" | Labelled "internal"; the don't-share footer is gone |

**What did *not* change, and must not drift:** client names never appear in bounty material or on
the board (see *Scrub rules*), and we never hand out credentials, deploy tokens, or GPU accounts.

---

## Where a bounty lives

| Thing | Path |
|---|---|
| Board entries (the 49 live bounties) | `web` repo → `apps/landing/app/bounties/bountyData.ts` |
| Board UI | same dir → `BountyBoard.tsx`, `BountyBoard.module.css` |
| Claims API + store | `web` → `app/api/bounties/claims/route.ts`, `app/lib/bountyClaims.ts` |
| Posted-bounty API + store | `web` → `app/api/bounties/posts/route.ts`, `app/lib/bountyPosts.ts` |
| Kits (operator staging) | this repo, one dir per bounty |
| Publishing steps | `README.md` here |

## Writing the entry

Add an object to `BOUNTIES` in `bountyData.ts`. Fields:

- **`id`** — track letter + next free number (`H5`, `P7`, …). **Never reuse an id**, including
  from a finished bounty. Ids are how claims in the database point at bounties.
- **`track`** — `R` research & GTM · `X` experiment analysis · `T` eval & tooling ·
  `D` data pipeline · `W` web & design · `H` hardware & capture · `P` platform & product ·
  `I` integrations & pilots. Adding a track means also adding its dot colour (both themes) in
  `BountyBoard.module.css`.
- **`ring`** — complexity, 0–3. 0 = public-web research, nothing to clone. 1 = specs and frozen
  artifacts. 2 = one extracted module with its tests. 3 = works against a whole component repo.
- **`size`/`days`** — S ≈ 1–3 d, M ≈ 3–6 d, L ≈ 1.5–3 wk of part-time contributor work. Budget
  roughly **5× what a CTO-plus-agent pass would take**.
- **`importance`** — 1–5, drives the default sort. Reserve 5 for work that unblocks a product line.
- **`kit`** — the kit dir name, even before the kit exists. Match `README.md`'s planned-kit table.
- **`desc` / `hand` / `accept` / `skills`** — see the writing rules below.
- **`done`** — set `true` when finished (see *Finishing*). Omit otherwise.
- **`claimed`** — legacy static annotation, effectively dead. Live claimants come from the API.

### Writing rules

1. **`desc` says why it matters, not just what to build.** The good entries name the real defect or
   the real opportunity ("a documented, test-pinned false negative", "our docs promise a runner that
   doesn't exist"). Someone should be able to tell from `desc` alone whether they want it.
2. **`accept` must be checkable by a third party.** Counts, thresholds, "passes the checkers",
   "flips the pinned test". If you cannot say how you'd verify it, the bounty is not ready.
3. **Permit a negative result** wherever the answer isn't known. "or an honest null if it adds
   nothing" belongs in `accept` for every study — otherwise we've paid for a foregone conclusion.
4. **`hand` states what we supply**, including anything that runs on our side (GPU, Modal, model
   credits, bench time with hardware). Contributors never get credentials.
5. **No client names, ever** — say "a robotics-data partner", "an academic health system",
   "a real-estate pilot", and note *named at claim* in `desc`. The name is spoken, never typed.
6. **Sober voice, no hype.** No em-dash-free rewrite needed — just match the surrounding entries.

## Ring 3 and direct-codebase bounties — the one thing to get right

Ring 3 now means "needs a whole component repo", and bounties may point at the live codebase
instead of a scrubbed kit. That removes the structural guarantee the kit model gave us: with a kit,
scrubbing was enforced by construction; with repo access, it is enforced only by whoever grants it.

Before granting any contributor access to a component repo, check the known leak surface:

- **`web`** — `embed.ts`, `share.ts`, `WORKFLOW-GAPS.md`, `vite.config.ts`,
  `packages/protocol` (`rest.ts`, `types.ts`, two test files); `landing`'s contact route has held a
  personal address.
- **`server`** — ~179 client-name hits, notably `reconstruct_pilot.py` (which also carries real
  recall numbers), `app.py`, `store.py`, and the pilot docs.
- **`core`** — `hygiene.py` ("Chorus-style"), plus `finc` on some feature branches. The branch
  *name* `feat/efficura-chorus-pilot` leaks on its own.
- Clean today, and the reason ring-2 extractions were easy: `server/qc`, `server/ingest`,
  `export/`, `agent/`, `llm/`.

So for a ring-3 bounty, pick one: scope it to a clean subtree, prepare a scrubbed working branch,
or accept that the contributor sees pilot names and get that decision made deliberately — by the
founder, not by an invite click. Re-run both sweeps (`README.md` has the pattern) on anything you
extract.

## Landing it on the board

```bash
cd /tank/docs/code/platform/web            # or a worktree — see the caution below
# edit apps/landing/app/bounties/bountyData.ts
npm --prefix apps/landing install
npm --prefix apps/landing run lint         # blocks the deploy if it fails — see below
npm --prefix apps/landing test
npm --prefix apps/landing run build
```

Then commit **only** the board files, push to web **`main`**, and add the planned-kit row to
`README.md` here. Finally bump the platform pin:

```bash
cd /tank/docs/code/platform && git add web && git commit -m "bump web to <sha> — <what>"
```

Three traps, each of which has already bitten once:

- **Deploy from `main` only.** The landing auto-deploys on push to web `main`. Dispatching the
  workflow against an integration branch **reverts main-only landing work** — it silently rolled
  back the billing UI and the contact email on 2026-08-08.
- **Lint is a deploy gate.** `next build` runs ESLint, and `react/no-unescaped-entities` fails the
  build on a bare `'` in JSX text. Write `Don&apos;t`. PR #6 sat undeployed because of exactly this,
  and the board silently kept serving the previous copy — a green merge is *not* a live page.
- **The local `platform/web` checkout is usually on an integration branch** with unrelated
  in-flight work. Use `git worktree add <dir> --detach origin/main` rather than switching branches.

Verify after the deploy run goes green:

```bash
curl -s https://www.open-reality.io/bounties | grep -o "<the new title>"
curl -s -o /dev/null -w "%{http_code} %header{x-robots-tag}\n" https://www.open-reality.io/bounties
```

## Who owns the authored bounties

All 49 are attributed to **David Zhang** on the board (`BOARD_OWNER_NAME` in `bountyData.ts` —
display only). Because a bounty's poster is the one who retires it, he can mark any authored bounty
complete from the page too; that writes a `bounty_board_done` row and is reversible from the same
screen, under "Retired from the board".

Ownership is decided server-side in `app/lib/boardOwner.ts` by **email**, so it works with no
out-of-band configuration: the default is the address already in `contact.ts`, every address on the
Clerk account is checked (not just the primary — the founder signs in through Google OAuth), and
either `BOUNTY_OWNER_EMAILS` (comma-separated) or a pinned `BOUNTY_OWNER_USER_ID` overrides it.
That module never reaches a browser bundle. If ownership ever needs to move or widen — a second
operator, a changed address — set `BOUNTY_OWNER_EMAILS` in the Vercel project and redeploy; nothing
in the code needs editing.

## Finishing a bounty

Two ways, and they do not interchange: `done: true` in the file is the permanent, code-reviewed
close; a `bounty_board_done` row is the owner clearing the board without a deploy. Either hides the
bounty; neither can un-hide what the other hid.

Set `done: true` on the entry. It leaves the board — rows, filters, counts, and the "scoped work"
total all ignore it — while the entry itself stays in the file as the record. **Do not delete the
entry and do not reuse its id**: rows in `bounty_claims` reference bounty ids, and a recycled id
would silently attach an old claimant to a new bounty.

"Open bounties" on the board counts what is **not finished**, board and posted together. Claimed
bounties still count as open, because several people may work the same one.

A contributor's post is retired by its poster, not by you — see *Contributor-posted bounties*.

## Contributor-posted bounties

**Built 2026-08-11** (web `7deba19`). Any signed-in user can post a bounty from the board itself; it
appears alongside the authored ones and is claimable and joinable like any other. There is no
operator review step in the path — a post is live the moment it is submitted.

Posted bounties are a **second lifecycle**, deliberately separate from the one above:

| | Board bounties (`bountyData.ts`) | Posted bounties (`bounty_posts` table) |
|---|---|---|
| Authored by | operators, in code | any signed-in user, from the page |
| Ids | track letter + number (`H1`, `X8`) | `U<seq>` off a bigserial — namespaces cannot collide |
| Attributed to | David Zhang, on every entry | the account that posted it |
| Retired by | `done: true` + a deploy, **or** the board owner from the page | **its poster only**, from the page |
| Reopen | edit the flag, or reopen from the page if it was retired there | the poster; finished posts stay visible to them alone |
| Has a `kit` | yes | no — the board omits the line when empty |

**Only the poster can mark a bounty complete**, and that is enforced in the store's `UPDATE … WHERE
seq = $1 AND author_id = $2` rather than in a route-level `if`, so a future caller cannot forget it.
A non-author gets `403 not_your_bounty` whether or not the bounty exists — the same answer either
way, so the endpoint leaks nothing about ids it will not act on. Operators have **no UI path** to
retire someone else's post; that is the intended asymmetry, and the escape hatch is SQL:

```sql
-- operator override, e.g. spam or an abandoned post
UPDATE bounty_posts SET done_at = now() WHERE seq = <n>;
```

Guards in place: authenticated posting only, per-author cap of 25 open posts, field validation with
length caps (title 120, description 4000, rest 2000), and author names that fall back
`fullName → username → "Contributor"` so an email address can never surface. React escapes all of
it on render; nothing here goes near `dangerouslySetInnerHTML`.

Worth knowing when triaging: a posted bounty carries no kit and no scrub review, so **nothing about
posting grants any repo access**. If a posted bounty is worth running for real, an operator promotes
it into `bountyData.ts` as a proper entry with a kit — the post itself stays a proposal that
happens to be claimable.

## Open questions for the founder

These follow from the 2026-08-09 rewrite and are **not** settled in code or docs:

1. **Payment.** The board now promises payment attached to each bounty. No amounts, no schedule, no
   payout path exists. Until it does, every bounty is implicitly unpaid — decide the model, or the
   promise ages badly.
2. **The IP agreement.** The old copy required it before a first PR; the new copy dropped the
   mention. The template was already pending legal. Decide whether it is still a gate — the answer
   changes what an operator must do before granting repo access.
3. **Per-person limits.** "One active bounty per person" is gone. If there is no cap, say so; if
   there is, it needs to be stated somewhere a contributor reads.
4. **Board visibility.** The "unlisted, don't share" footer is gone, but the route is still
   `noindex` with no inbound links. Either it is genuinely internal (keep the caution) or it is
   semi-public (then it deserves a link and a proper public framing).
5. **Slack/Discord.** ~~Not set up.~~ The Discord exists (invite `cNKGHYTAN`) and is linked from the
   board masthead as of 2026-08-11. The claim step's note-to-self — "remind me to setup a slack /
   discord channel" — is now stale but still renders to contributors; it is the founder's copy, so
   it stays until he changes it.
