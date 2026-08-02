# Tool contract: registration, dispatch, and error propagation

This distills how `agent_runtime` works from the code, so you can write meaningful behavior
tests and fakes without needing the rest of the server. Read this before writing tests; it's the
map of what "correct behavior" means at each layer.

## The four layers

```
AgentRuntime            one per agent session; owns registration + event emission
  -> ToolRegistry        validates args, runs the handler with a timeout, normalizes the result
    -> ToolDefinition     one per tool: name, description, pydantic args model, handler function
      -> handler          a bound method on VGGTTools or UITools (or, in your fakes, anything
                           with a matching signature)
```

`agent_runtime/schemas.py` defines the pydantic **args models** (one per tool, all subclassing
`StrictModel`, which sets `extra="forbid"` — unknown keys are a validation error, not silently
dropped). `agent_runtime/tool_registry.py` defines `ToolDefinition` (a frozen dataclass: name +
description + `args_model` + `handler`) and `ToolRegistry` (the dispatcher). `agent_runtime/runtime.py`
defines `AgentRuntime`, which owns one `ToolRegistry` per session, constructs the two tool
implementation classes (`VGGTTools`, `UITools` — see `agent_runtime/tools/`), and registers all
14 tools against them in `_register_tools()`.

## Registration

A tool is registered by constructing a `ToolDefinition` and calling `registry.register(...)`:

```python
registry.register(ToolDefinition(
    name="get_scene_snapshot",
    description="Return map/submap/detection summary from VGGT-SLAM state.",
    args_model=GetSceneSnapshotArgs,
    handler=self.vggt.get_scene_snapshot,
))
```

- `name` is the string a caller (an LLM tool-call, or your test) dispatches by. `ToolRegistry`
  stores definitions in a plain `dict[str, ToolDefinition]` — registering the same name twice
  silently replaces the earlier one (no duplicate-name guard exists today; if you think that's a
  bug, it's a legitimate thing to flag/test).
- `args_model` is a pydantic `BaseModel` subclass. The handler never sees a raw dict — it always
  receives a validated model instance.
- `handler` is any callable of shape `(args_model_instance) -> dict`. In production these are
  bound methods on `VGGTTools`/`UITools`; in your tests they can be anything with that shape,
  including a bare lambda.
- `AgentRuntime._register_tools()` is where all 14 production tools are wired — read it as the
  canonical list of tool name -> args model -> handler triples.

## Dispatch (the tool-call cycle)

Calling `AgentRuntime.execute_tool(tool_name, args, timeout_s=10.0)` runs this cycle:

1. **Emit `started`** — an `AgentToolEvent(status="started", args=args)` goes out via
   `emit_event("agent_tool_event", ...)` before anything else runs, with a fresh `event_id`
   (`uuid4()[:12]`).
2. **Delegate to `ToolRegistry.execute(name, args, timeout_s)`**:
   a. Look up the tool by name; **unknown name -> `ToolExecutionError("Unknown tool: {name}")`**.
   b. Validate `args` (a plain dict) against `args_model.model_validate(...)`; **validation
      failure -> `ToolExecutionError("Invalid args for tool '{name}': {pydantic error}")`**,
      wrapping the original `pydantic.ValidationError` as `__cause__`.
   c. Submit the handler to a `concurrent.futures.ThreadPoolExecutor` (`max_workers`, default 4
      per `AgentRuntime`) and block on `future.result(timeout=max(0.1, timeout_s))`.
      **Timeout -> `ToolExecutionError("Tool '{name}' timed out")`**.
      **Any other handler exception -> `ToolExecutionError("Tool '{name}' failed: {exc}")`**,
      wrapping the original as `__cause__`.
   d. If the handler's return value isn't a `dict`, it's wrapped as `{"value": result}`.
   e. `result.setdefault("latency_ms", ...)` — the registry always stamps a latency unless the
      handler already provided one.
3. **On success**, `execute_tool` emits a `succeeded` `AgentToolEvent` (same `event_id`, `result`
   and `latency_ms` set) and returns `{"ok": True, "tool": name, "data": result, "latency_ms": N}`.
4. **On `ToolExecutionError`** (i.e., anything from step 2), `execute_tool` emits a `failed`
   `AgentToolEvent` (`error=str(exc)`) and returns `{"ok": False, "tool": name, "error": str(exc),
   "latency_ms": N}` — **`execute_tool` never raises**; every failure mode above is normalized
   into this same `{"ok": False, ...}` shape. Anything that isn't a `ToolExecutionError` (a bug
   inside `ToolRegistry.execute` itself) *would* propagate — that path shouldn't be reachable in
   correct code, and is worth a test asserting it stays that way.

## Error propagation, summarized

| Failure | Raised as | Caught where | Caller sees |
|---|---|---|---|
| Unknown tool name | `ToolExecutionError` | `ToolRegistry.execute` raises, `AgentRuntime.execute_tool` catches | `{"ok": False, "error": "Unknown tool: ..."}` |
| Bad args (pydantic) | `ToolExecutionError` (wraps `ValidationError`) | same | `{"ok": False, "error": "Invalid args for tool '...': ..."}` |
| Handler exceeds `timeout_s` | `ToolExecutionError` | same | `{"ok": False, "error": "Tool '...' timed out"}` |
| Handler raises any other exception | `ToolExecutionError` (wraps original) | same | `{"ok": False, "error": "Tool '...' failed: ..."}` |
| Handler returns non-dict | *(not an error)* | `ToolRegistry.execute` wraps it | `{"ok": True, "data": {"value": <whatever it returned>}}` |

Every one of the four failure rows above should have its own test: construct a `ToolRegistry`
directly (fast, no `AgentRuntime` needed) or go through `AgentRuntime.execute_tool` (to also
assert the emitted event sequence — `started` then `failed`/`succeeded`, same `event_id`).

## `list_tools()` and `close()`

- `AgentRuntime.list_tools()` / `ToolRegistry.list_tools()` return
  `[{"name", "description", "args_schema"}]` per tool, where `args_schema` is
  `args_model.model_json_schema()` (a JSON Schema dict) — this is what an LLM orchestrator would
  see to decide what to call and with what shape. A good test: every registered tool's
  `args_schema` round-trips (it's valid JSON-serializable, and required/optional fields match
  what the model actually enforces).
- `AgentRuntime.close()` calls `ToolRegistry.shutdown()`, which shuts down the thread pool with
  `cancel_futures=True` and does not wait (`wait=False`) — in-flight handlers are not guaranteed
  to finish. Worth a test that `close()` doesn't hang and doesn't raise even with pending work.

## `SceneIndex` (separate from tool dispatch)

`agent_runtime/scene_index.py`'s `SceneIndex` is a small, self-contained, thread-safe (a single
`threading.Lock`) in-memory index over detections — **it is not wired into `AgentRuntime` in
this kit** (in the source repo it's owned by the larger `SpatialAgent` orchestrator, which isn't
part of this kit). Test it standalone:

- `ingest(detections)` upserts by `(query, matched_submap, matched_frame)`, keeping the
  higher-confidence record on a collision, and truncates each query's list to `max_per_query`
  (default 32) sorted by `(confidence, last_seen_ts)` descending. Returns the count of records it
  *saw* (not necessarily kept after truncation) — this is a real, slightly surprising contract
  worth a test that pins it explicitly.
- `search(query, max_results)` normalizes the query (`str().strip().lower()`), returns exact
  matches first (`match_type="exact"`), then partial matches (substring either direction, or any
  whitespace-split term match) as `match_type="partial"`, de-duplicated by key, capped at
  `max_results`.
- `summary(max_queries)` returns indexed-query/detection counts plus the top queries by
  `(top_confidence, count)`.
- `clear()` empties both internal dicts.

## What a minimal fake needs (see `agent_runtime/_interfaces.py` + `docs/fakes-pattern.py`)

To exercise `VGGTTools`'s handlers (registered as 8 of the 14 tools) you need a fake
`streaming_slam` satisfying `StreamingSLAMProtocol` in `agent_runtime/_interfaces.py` — a plain
class is enough, no mocking framework (see `docs/fakes-pattern.py` for this codebase's usual
style: small duck-typed classes like `FakeSubmap`/`FakeMap`/`FakeSolver`, built for a *different*
test suite but the same idea applies here). To exercise `inspect_detection` specifically you
additionally need a fake (or the provided stub) `object_detector` satisfying
`ObjectDetectorProtocol`. `UITools`'s 6 tools only need a callable `emit_ui_command`.
