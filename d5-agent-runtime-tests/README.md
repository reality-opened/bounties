# Bounty D5 — Agent-runtime test bootstrap
**Track:** Data pipeline · **Access ring:** Ring 2 · **Size:** L (~8 days)

## Context
`agent_runtime` is the tool-execution core of our spatial agent: a registry of pydantic-validated
tools, a dispatcher that runs them with a timeout and normalizes success/failure into one
envelope shape, and an in-memory index over live object detections. In the source repo it sits
under a much larger streaming SLAM server and is exercised only indirectly, through the full
agent orchestrator — it currently has **no dedicated unit tests of its own**. This bounty
bootstraps that test layer from scratch: registration, dispatch, error paths, and the scene
index, all without the SLAM stack, GPU, or network behind them.

## The task
Bootstrap the unit-test layer for `agent_runtime`: registry/dispatch, the scene index, and the
tool packs (`VGGTTools`, `UITools`), including error paths. Read `docs/tool-contract.md` first —
it distills exactly how registration, dispatch, and error propagation work from the code, with a
table of every failure mode and what the caller sees for each. That table is your test list.

This needs to be **behavior-level testing**, not import-only smoke tests: construct a
`ToolRegistry`, register real (or minimal fake) handlers, and assert on what `execute()` /
`AgentRuntime.execute_tool()` actually return and emit — not just that the modules import
cleanly. Concretely, that means covering (at least):
- Registering a tool and dispatching a call end-to-end (args validated, handler invoked with the
  parsed model, result normalized, `latency_ms` present).
- Every error path in the table in `docs/tool-contract.md`: unknown tool name, invalid args
  (pydantic `ValidationError` wrapped), handler timeout, handler raises — and that
  `AgentRuntime.execute_tool` never raises, always returning `{"ok": False, ...}` plus the
  matching `agent_tool_event` sequence (`started` then `failed`).
- `SceneIndex` in isolation: upsert/dedup-by-key behavior, confidence-wins-on-collision,
  per-query truncation to `max_per_query`, exact-vs-partial search matching, `summary()`.
- At least one `VGGTTools` handler exercised against a fake `streaming_slam` (see
  `agent_runtime/_interfaces.py`'s `StreamingSLAMProtocol` for the exact shape needed, and
  `docs/fakes-pattern.py` for this codebase's house style for writing such fakes) and one
  `UITools` handler against a fake `emit_ui_command`.
- `list_tools()`'s JSON-schema output is well-formed for every registered tool.

## Interfaces stubbed for isolation — behavior contract described below
Two things `agent_runtime` depended on in the source repo are not included in this kit; both are
stubbed in `agent_runtime/_interfaces.py`, with the reasoning and exact contract in that file's
module docstring:

1. **`vggt_slam.object_detector.ObjectDetector`** (core's CLIP+SAM3 open-set detector — a
   different, model-backed repo). `tools/vggt_tools.py: inspect_detection` calls two of its
   static methods directly; those two (`image_to_base64`, `mask_overlay_to_base64`) are given
   real, Pillow-backed reimplementations with the same input/output contract (no OpenCV/torch
   needed). The model-backed methods (`segment_all`, `compute_3d_bbox`) raise
   `NotImplementedError` and are documented as `ObjectDetectorProtocol` — fake `slam.object_detector`
   against that Protocol in your tests.
2. **The `streaming_slam` object** passed into `AgentRuntime`/`VGGTTools`. This was always
   duck-typed dependency injection in the source (never an import), but it's the dependency your
   fakes most need to get right. `StreamingSLAMProtocol` (+ nested `Solver`/`Map`/`Submap`
   protocols) in `agent_runtime/_interfaces.py` documents exactly the attributes/methods
   `agent_runtime` touches — nothing more, nothing from the real (much larger) `StreamingSLAM`
   class. `docs/tool-contract.md` has the narrative version of the same contract.

Neither stub changes any dispatch/validation/error-propagation behavior — they only replace two
out-of-scope, heavy, external dependencies so the package imports and runs standalone.

## What's in this repo
```
agent_runtime/
  __init__.py           re-exports AgentRuntime, ToolExecutionError
  runtime.py             AgentRuntime: registers all 14 tools, owns one ToolRegistry per
                          session, the execute_tool() dispatch + event-emission cycle
  schemas.py              pydantic StrictModel args classes, one per tool (extra="forbid")
  tool_registry.py        ToolDefinition + ToolRegistry: validation, threaded execution w/
                          timeout, result normalization -- THE core dispatch logic to test
  scene_index.py          SceneIndex: thread-safe in-memory detection index (standalone,
                          not wired into AgentRuntime in this kit -- test it on its own)
  _interfaces.py          <-- stubs: ObjectDetector (Pillow reimpl + NotImplementedError
                          model-backed methods) and the StreamingSLAMProtocol contract;
                          read this file's module docstring first
  tools/
    vggt_tools.py         VGGTTools: 8 tools reading/mutating a streaming_slam-shaped object
    ui_tools.py            UITools: 6 tools that just build+emit a validated AgentUICommand

docs/
  tool-contract.md        <-- READ FIRST: registration, dispatch cycle, error-propagation
                          table, SceneIndex contract, what a minimal fake needs
  fakes-pattern.py         copy of this codebase's house fake-object pattern (from a
                          *different* test suite, dataset-export) -- illustrates the style
                          (small duck-typed classes, no mocking framework) to follow for your
                          own streaming_slam/object_detector fakes. It is a reference, not
                          runnable here: it imports vggt_slam/cv2, which aren't in this kit.
```
There is no `tests/` directory yet — that's the bounty. Add one (with a `conftest.py` if you
need path bootstrapping, matching what's already done implicitly by running `pytest` from this
kit's root).

## Acceptance criteria
- Behavior-level tests (not import-only) for: tool registration + dispatch, every error path in
  `docs/tool-contract.md`'s table, `SceneIndex`, and at least one handler from each of
  `VGGTTools`/`UITools`.
- Error paths are asserted on their actual return shape (`{"ok": False, "error": "..."}`) and,
  where relevant, the emitted event sequence — not just "doesn't crash."
- Suite is GPU-free and runs in **under 30 seconds**, no network.
- `python3 -c "import agent_runtime"` (and its submodules) succeeds standalone in a venv with
  only numpy/pydantic/pytest/Pillow installed — confirmed as part of this kit's own setup, keep
  it that way.

## Getting started
```bash
python3 -m venv .venv && source .venv/bin/activate   # or virtualenv if venv is unavailable
pip install numpy pydantic pytest Pillow
python3 -c "import agent_runtime; print(agent_runtime.AgentRuntime, agent_runtime.ToolExecutionError)"
```
Then:
1. Read `docs/tool-contract.md` in full — it's the spec for this bounty.
2. Read `agent_runtime/_interfaces.py`'s module docstring so you know exactly what's real vs.
   stubbed and why.
3. Skim `agent_runtime/tool_registry.py` (69 lines) and `agent_runtime/runtime.py`'s
   `_register_tools()` + `execute_tool()` — small enough to read in one sitting.
4. Start with `ToolRegistry` in isolation (fastest signal, no `AgentRuntime`/fakes needed): a
   couple of trivial `ToolDefinition`s with lambda handlers are enough to nail down the
   validation/timeout/exception paths.
5. Write a minimal `streaming_slam` fake against `StreamingSLAMProtocol` (see
   `docs/fakes-pattern.py` for the style) and exercise one or two `VGGTTools` handlers through
   `AgentRuntime.execute_tool`.
6. Test `SceneIndex` standalone — it has no dependency on anything else in this kit.
7. Fill out the rest of the error-path table.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
