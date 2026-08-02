"""Pattern demo (NOT the test suite): intercept OpenRouterClient's HTTP calls
with zero network, via a fake httpx transport handed to the OpenAI SDK client.
"""
from __future__ import annotations

import httpx
from openai import OpenAI


def make_fake_client(handler) -> OpenAI:
    """`handler(request: httpx.Request) -> httpx.Response`; one client per case."""
    transport = httpx.MockTransport(handler)
    return OpenAI(api_key="test-key", http_client=httpx.Client(transport=transport))

def canned_json_response(payload: dict, status_code: int = 200):
    """Simplest handler: always return the same JSON body, ignore the request."""
    return lambda request: httpx.Response(status_code, json=payload)

def _demo() -> None:  # run: python tests/example_fake_transport.py
    body = {"choices": [{"index": 0, "finish_reason": "stop",
                          "message": {"role": "assistant", "content": "hi"}}]}
    client = make_fake_client(canned_json_response(body))
    resp = client.chat.completions.create(model="x", messages=[{"role": "user", "content": "hey"}])
    assert resp.choices[0].message.content == "hi"
    print("fake transport pattern OK -- no network involved")


if __name__ == "__main__":
    _demo()
