# Bounty D4 — LLM-client unit-test suite
**Track:** Data pipeline · **Access ring:** Ring 2 · **Size:** M (~3.5 days)

## Context
`OpenRouterClient` is the one seam between our product code and every hosted LLM call: chat
completions with retry/backoff, an ordered fallback chain across models, JSON extraction from
free-form model output, and text embeddings — all through an OpenAI-SDK-compatible client
pointed at OpenRouter. It currently has **no unit tests**. It's a small, self-contained module
(stdlib + the `openai` package only, no other internal imports), which makes it a clean,
bounded target for a first real test suite: no product-specific mocking, no GPU, no other
subsystem to drag in.

## The task
Write a unit-test layer for `llm/openrouter_client.py` against a **fake HTTP transport** — never
a real network call. `tests/example_fake_transport.py` shows the mechanics (a `httpx.MockTransport`
handed to the underlying OpenAI SDK client); it is a short pattern demo, not part of the suite —
build your actual tests using whatever fake-transport shape you find cleanest (the demo's
`make_fake_client`/`canned_json_response` helpers, request-recording handlers, per-model routing
by inspecting the request body, etc).

Cover, at minimum:
- **Retry/backoff schedule** — `_retry_with_backoff`'s exponential delay (`0.25 * 2**attempt` +
  jitter) and `max_retries` bound; assert it gives up after the right number of attempts and
  succeeds if a later attempt works. (You'll want to monkeypatch `time.sleep` so this doesn't
  actually take seconds.)
- **Fallback-chain order** — `chat_text` tries `primary_model` then each of `fallback_models` in
  order, marks `degraded=True` and `last_model`/`degraded_mode` correctly once it falls back, and
  raises with every model's error joined together if all models fail.
- **Malformed-JSON recovery** — `_extract_json_blob`'s three extraction paths (fenced ` ```json `
  block, brace-counting scan with string/escape awareness, no JSON found) and `chat_json`'s
  behavior when the model returns non-JSON, JSON that isn't an object, or nothing at all.
- **Timeout handling** — a transport that hangs/errors past the client's `timeout`, and that this
  surfaces as a retryable failure, not a silent hang.
- **Header/auth assembly** — `_request_once`'s `extra_headers` (`HTTP-Referer`, `X-OpenRouter-Title`)
  and the constructor's handling of `api_key` / `referer` / `app_name` / the `OPENROUTER_HTTP_REFERER`
  env var. Check header **names** and that values are wired from the right source — never assert
  or print a real key (there isn't one in this kit; keep it that way in fixtures/tests too).
- Constructor validation: empty/missing `api_key` raises.
- `embed()`: empty input returns `[]` without a request; non-empty batches the call and returns
  vectors row-aligned to input.

## What's in this repo
```
llm/
  openrouter_client.py   the module under bounty, copied verbatim (self-contained: stdlib +
                          the `openai` package only, no other server.* imports to stub)
  __init__.py             re-exports LLMResponse / OpenRouterClient

tests/
  example_fake_transport.py   SHORT pattern demo (~30 lines) of faking the HTTP layer via
                               httpx.MockTransport — not the test suite itself, just the
                               mechanism. Run it directly: it asserts + prints on success.
```
There is no `tests/test_openrouter_client.py` yet — writing it (plus any fixtures/conftest you
need) is the bounty.

## Acceptance criteria
- Unit tests cover every failure mode listed above under **The task**, using a fake transport —
  not the real `openai`/OpenRouter network.
- A `conftest.py` (or equivalent) fixture that makes live network calls impossible for the whole
  suite (e.g. monkeypatch `httpx.Client._transport`/`send`, or a fixture that fails the test if
  any real socket connection is attempted) — enforced, not just "we didn't call it."
- ≥90% branch coverage on `llm/openrouter_client.py`, measured with `coverage.py`
  (`coverage run --branch`, report via `coverage report`).
- Full suite runs in **under 10 seconds** (this is why retry/backoff delays must be
  monkeypatched, not actually slept).
- Zero live network calls, zero GPU, zero dependency on anything outside this kit.

## Getting started
```bash
python3 -m venv .venv && source .venv/bin/activate   # or virtualenv if venv is unavailable
pip install openai httpx pytest coverage
python3 -c "import llm.openrouter_client"   # confirms the module imports standalone
python3 tests/example_fake_transport.py     # confirms the fake-transport mechanics work
```
Then:
1. Read `llm/openrouter_client.py` top to bottom — it's ~280 lines, all the behavior you need to
   test is there (no hidden state, no async).
2. Read `tests/example_fake_transport.py` and decide how you want to shape your own fakes —
   per-call recording, per-model canned responses, error injection, etc.
3. Build the no-network-enforcing fixture first; wire every test through it from the start.
4. Work through the failure-mode list one at a time; run `coverage run --branch -m pytest &&
   coverage report -m` as you go to find untested branches (fallback exhaustion, JSON-shape
   branches in `_extract_json_blob`, the images_b64 path in `_build_messages`, etc).

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
