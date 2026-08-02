"""Stub / Protocol interfaces for agent_runtime's out-of-package dependencies.

`agent_runtime` is vendored out of `server/agent/` (a much larger streaming
SLAM server) for isolated unit testing. Two things it depended on in the
source repo are NOT included in this kit; both are stubbed here so the
package imports and is testable standalone.

1. `vggt_slam.object_detector.ObjectDetector` -- core's CLIP+SAM3 open-set
   object detector (`reality-opened/core`, a *different* repo). It's a heavy,
   model-backed dependency (torch, open3d, SAM3/CLIP weights) entirely out of
   scope for this kit. `tools/vggt_tools.py: inspect_detection` calls two of
   its static methods directly (`image_to_base64`, `mask_overlay_to_base64`);
   those are cheap, CPU-only image encoding, so they're reimplemented below
   with Pillow -- same externally-visible contract (RGB uint8 array in,
   base64 image string out), no OpenCV/torch needed. The model-backed
   methods (`segment_all`, `compute_3d_bbox`) are left as
   `NotImplementedError` stubs: production behavior can't be reproduced
   without the models, so tests must fake `slam.object_detector` against
   `ObjectDetectorProtocol` instead of instantiating this class for them.

2. The `streaming_slam` object passed into `AgentRuntime.__init__` /
   `VGGTTools.__init__`. This was never an import in the source -- it's
   duck-typed dependency injection; the real object is `StreamingSLAM`
   (`server/streaming_slam.py`, not part of `server/agent/` and not part of
   this kit). It IS the biggest thing a test double needs to get right, so
   `StreamingSLAMProtocol` below documents exactly the surface
   `agent_runtime` touches -- nothing more. See `docs/tool-contract.md` for
   the narrative version and `docs/fakes-pattern.py` for this codebase's
   house style for writing this kind of duck-typed fake.

Every stub/Protocol here is also called out in this kit's README.
"""

from __future__ import annotations

import base64
from io import BytesIO
from typing import Any, Iterable, Optional, Protocol

import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# 1. ObjectDetector -- replaces `from vggt_slam.object_detector import ObjectDetector`
# ---------------------------------------------------------------------------


class ObjectDetectorProtocol(Protocol):
    """The `slam.object_detector` contract `VGGTTools` calls through an
    instance (as opposed to the bare-static-method calls `ObjectDetector`
    below actually implements). Real implementation: core's
    `vggt_slam.object_detector.ObjectDetector` (PE-Core CLIP + SAM3). Fakes
    only need to satisfy this shape, not subclass anything.
    """

    def segment_all(self, image_pil, query: str) -> Iterable[tuple[Any, Any, float]]:
        """-> iterable of (mask_2d: np.ndarray[bool] shape (H,W), box_2d, score: float)."""
        ...

    def compute_3d_bbox(
        self, submap, frame_idx: int, mask, graph, scene_center
    ) -> Optional[dict]:
        """-> {"center": [x,y,z], "extent": [ex,ey,ez], "rotation": [...]} or None
        when there aren't enough points under the mask."""
        ...


class ObjectDetector:
    """Stand-in for core's `vggt_slam.object_detector.ObjectDetector`.

    `inspect_detection` (tools/vggt_tools.py) calls `image_to_base64` and
    `mask_overlay_to_base64` as bare static methods (no live detector
    instance needed), so those two get real, behavior-equivalent
    implementations here. `segment_all` / `compute_3d_bbox` are the
    model-backed, per-session methods reached via `slam.object_detector`;
    fake those against `ObjectDetectorProtocol` above in your tests rather
    than instantiating this class.
    """

    @staticmethod
    def image_to_base64(image_np: np.ndarray) -> str:
        """RGB (H,W,3) uint8 array -> base64-encoded JPEG string.

        Production (core) encodes via cv2; this encodes via Pillow to avoid
        pulling OpenCV into an otherwise GPU-free, CV-library-free kit. The
        contract (input shape/dtype, output being a base64 JPEG string) is
        identical; exact byte output is not.
        """
        buf = BytesIO()
        Image.fromarray(image_np).convert("RGB").save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    @staticmethod
    def mask_overlay_to_base64(image_np: np.ndarray, mask: np.ndarray) -> str:
        """RGB (H,W,3) uint8 array + boolean (H,W) mask -> base64 PNG with the
        mask alpha-blended over the image. Production also draws a contour
        outline (cv2.findContours/drawContours); this simplified version
        skips the outline -- documented here, not silently dropped."""
        overlay = image_np.copy()
        color = np.array([0, 255, 100], dtype=np.uint8)
        overlay[mask] = (overlay[mask] * 0.5 + color * 0.5).astype(np.uint8)
        buf = BytesIO()
        Image.fromarray(overlay).convert("RGB").save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")

    def segment_all(self, image_pil, query: str) -> Iterable[tuple[Any, Any, float]]:
        raise NotImplementedError(
            "segment_all is model-backed (CLIP+SAM3, core repo, not in this kit) -- "
            "fake slam.object_detector against ObjectDetectorProtocol in tests instead "
            "of instantiating this stub for it."
        )

    def compute_3d_bbox(self, submap, frame_idx, mask, graph, scene_center):
        raise NotImplementedError(
            "compute_3d_bbox is model-backed (core repo, not in this kit) -- fake "
            "slam.object_detector against ObjectDetectorProtocol in tests."
        )


# ---------------------------------------------------------------------------
# 2. streaming_slam -- documents the duck-typed dependency-injection contract
# ---------------------------------------------------------------------------


class SubmapProtocol(Protocol):
    def get_frame_at_index(self, i: int):
        """-> a (3,H,W) tensor-like exposing .cpu().permute(1,2,0).numpy()
        (a real torch.Tensor in production; a tiny fake class with those
        three chained methods -- or a numpy array plus a wrapper -- is
        enough for a test double)."""
        ...


class MapProtocol(Protocol):
    def get_num_submaps(self) -> int: ...
    def get_submap(self, submap_id: int) -> Optional[SubmapProtocol]:
        """Returns None for an unknown submap_id -- callers must handle that."""
        ...


class GraphProtocol(Protocol):
    def get_num_loops(self) -> int: ...


class SolverProtocol(Protocol):
    map: MapProtocol
    graph: GraphProtocol


class StreamingSLAMProtocol(Protocol):
    """The surface `agent_runtime` touches on `StreamingSLAM`
    (`server/streaming_slam.py`, NOT part of `server/agent/` and not
    included in this kit). Write fakes to this shape -- see
    `docs/fakes-pattern.py` for this codebase's house style for duck-typed
    fakes (plain classes, no mocking framework) and `docs/tool-contract.md`
    for how each field/method is actually used.
    """

    solver: SolverProtocol
    accumulated_detections: list[dict]
    active_queries: list[str]
    latest_scene_center: Any  # numpy array; only `.tolist()` is called on it
    frame_count: int
    object_detector: ObjectDetectorProtocol
    _detection_lock: Any  # a context manager, e.g. threading.Lock() -- used as `with self.slam._detection_lock: ...`

    def add_query_progressive(self, query: str) -> Iterable[Any]:
        """A generator; agent_runtime only drains it (`for _ in gen(): pass`)
        to trigger progressive detection work as a side effect."""
        ...

    def remove_query(self, query: str) -> None: ...
