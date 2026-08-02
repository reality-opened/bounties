import { describe, expect, it } from 'vitest';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type ErrorPayload,
  type ServerToClientEvents,
} from '../events';
import type {
  BoundingBox3D,
  DebugDetectError,
  DebugDetectRequest,
  DebugDetectResponse,
  DebugDetectResults,
  DebugDetection,
  DebugFrameDiag,
  DebugSamMaskDiag,
  DetectionDescriptionRequest,
  DetectionDescriptionResult,
} from '../types';

/**
 * The 2026-07-24 contract audit found five events that both the server and the web clients
 * use live, but that this package never declared — they were raw string literals on both
 * sides. These tests pin the wire strings (the whole point of the constants) and pin the
 * payload shapes against the real server handlers:
 *
 *   describe_detection      -> server/server/app.py:4213
 *   detection_description   <- server/server/app.py:4225-4275
 *   debug_detect            -> server/server/app.py:4299
 *   debug_detect_results    <- server/server/app.py:4302-4324 (server/server/streaming_slam.py:1200-1407)
 *   error                   <- server/server/app.py:4051
 *
 * Type-level assertions here follow detectionGeometry.test.ts: every fixture is a typed
 * literal, so a shape regression fails `tsc` and the runtime expectations keep the fixture
 * honest under `vitest run`.
 */

describe('backfilled event-name constants', () => {
  it('maps the client events to the names the server handlers listen on', () => {
    expect(CLIENT_EVENTS.DESCRIBE_DETECTION).toBe('describe_detection');
    expect(CLIENT_EVENTS.DEBUG_DETECT).toBe('debug_detect');
  });

  it('maps the server events to the names the server emits', () => {
    expect(SERVER_EVENTS.DETECTION_DESCRIPTION).toBe('detection_description');
    expect(SERVER_EVENTS.DEBUG_DETECT_RESULTS).toBe('debug_detect_results');
    expect(SERVER_EVENTS.ERROR).toBe('error');
  });

  it('keeps every wire string unique within each direction', () => {
    const clientNames = Object.values(CLIENT_EVENTS);
    const serverNames = Object.values(SERVER_EVENTS);
    expect(new Set(clientNames).size).toBe(clientNames.length);
    expect(new Set(serverNames).size).toBe(serverNames.length);
  });

  it('keeps start_slam on the client contract (dead letter, kept for wire compatibility)', () => {
    // No server-side handler exists — SLAM auto-starts on the first `frame`
    // (server/server/app.py:4057-4066) — but sender.ts still emits it, so the constant stays.
    expect(CLIENT_EVENTS.START_SLAM).toBe('start_slam');
  });
});

describe('describe_detection / detection_description payloads', () => {
  it('types the request as exactly the three keys the handler reads', () => {
    const request: ClientToServerEvents[typeof CLIENT_EVENTS.DESCRIBE_DETECTION] = {
      submap_id: 3,
      frame_idx: 12,
      query: 'laptop',
    };
    // Mirrors the emit at apps/webserver/src/services/SLAMConnection.ts:256 and the reads at
    // server/server/app.py:4233-4238.
    expect(Object.keys(request).sort()).toEqual(['frame_idx', 'query', 'submap_id']);
  });

  it('accepts the success emit (submap/frame/query + description)', () => {
    const result: ServerToClientEvents[typeof SERVER_EVENTS.DETECTION_DESCRIPTION] = {
      submap_id: 3,
      frame_idx: 12,
      query: 'laptop',
      description: {
        title: 'Apple MacBook Pro 14"',
        category: 'laptop',
        brand: 'Apple',
        model: 'MacBook Pro 14',
        color: 'space black',
        materials: ['aluminium'],
        visible_text: [],
        distinguishing_features: ['notch'],
        confidence: 0.72,
        uncertainty_note: 'chip generation not visible',
        matches: [],
        model_name: 'test-vlm',
        grounded_by_search: false,
      },
    };
    expect(result.description?.brand).toBe('Apple');
    expect(result.error).toBeUndefined();
  });

  it('accepts every error-only emit the handler can produce', () => {
    // server/server/app.py:4225 / 4236 / 4256 / 4265 / 4275
    for (const error of ['enrichment_disabled', 'Invalid submap/frame', 'crop_failed', 'enrich_failed']) {
      const failed: DetectionDescriptionResult = { error };
      expect(failed.error).toBe(error);
      expect(failed.description).toBeUndefined();
    }
  });

  it('keeps the request and the result distinct types', () => {
    const request: DetectionDescriptionRequest = { submap_id: 0, frame_idx: 0, query: '' };
    expect(request.query).toBe('');
  });
});

describe('debug_detect request', () => {
  it('accepts the debug page request (thresholds + explicit top_k)', () => {
    // apps/webserver/src/detection-debug.ts:166-171
    const request: ClientToServerEvents[typeof CLIENT_EVENTS.DEBUG_DETECT] = {
      queries: ['laptop', 'chair'],
      clip_thresholds: { default: 0.2 },
      sam_thresholds: { default: 0.3 },
      top_k: 3,
    };
    expect(request.top_k).toBe(3);
  });

  it('accepts the summary page request, which omits top_k', () => {
    // apps/webserver/src/summary.ts:664-668 — the server then falls back to SAM_TOP_K_FRAMES
    // (server/server/streaming_slam.py:1215).
    const request: DebugDetectRequest = {
      queries: ['laptop'],
      clip_thresholds: { default: 0.2 },
      sam_thresholds: { default: 0.3 },
    };
    expect(request.top_k).toBeUndefined();
  });

  it('accepts a bare queries-only request', () => {
    const request: DebugDetectRequest = { queries: [] };
    expect(request.queries).toEqual([]);
  });
});

describe('debug_detect_results payload', () => {
  const bbox: BoundingBox3D = {
    center: [0.1, 0.2, 1.4],
    extent: [0.4, 0.3, 0.02],
    rotation: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    corners: Array.from({ length: 8 }, () => [0, 0, 0]),
  };

  const detection: DebugDetection = {
    success: true,
    query: 'laptop',
    bounding_box: bbox,
    confidence: 0.28 * 0.61,
    matched_submap: 1,
    matched_frame: 7,
    clip_score: 0.28,
    sam_score: 0.61,
  };

  const mask: DebugSamMaskDiag = {
    score: 0.61,
    clip_score: 0.28,
    combined_score: 0.28 * 0.61,
    box_2d: [10, 20, 110, 220],
    mask_image: null,
    above_sam_threshold: true,
    sam_threshold_used: 0.3,
    has_3d_box: true,
    bbox_3d: bbox,
    dedup_kept: true,
  };

  const frame: DebugFrameDiag = {
    submap_id: 1,
    frame_idx: 7,
    query: 'laptop',
    clip_similarity: 0.28,
    clip_rank: 1,
    above_threshold: true,
    in_top_k: true,
    sam_skipped: false,
    clip_threshold_used: 0.2,
    sam_threshold_used: 0.3,
    top_k_used: 3,
    thumbnail: null,
    resolution: '640×480',
    sam_masks: [mask],
    sam_error: null,
    detections_before_dedup: [detection],
  };

  const full: DebugDetectResponse = {
    queries: ['laptop'],
    clip_thresholds: { default: 0.2 },
    sam_thresholds: { default: 0.3 },
    top_k: 3,
    frames: [frame],
    raw_detection_count: 1,
    deduped_detection_count: 1,
    detections: [detection],
    total_frames_scanned: 12,
    query_time_ms: 918,
  };

  /** The shape both client pages use: bail on `error`, then read the diagnostics. */
  function summarize(results: DebugDetectResults): string {
    if (results.error) return `error:${results.error}`;
    return `${results.detections.length}/${results.raw_detection_count}`;
  }

  it('narrows the success branch on a plain `if (data.error)` check', () => {
    const results: ServerToClientEvents[typeof SERVER_EVENTS.DEBUG_DETECT_RESULTS] = full;
    expect(summarize(results)).toBe('1/1');
  });

  it('narrows the error-only branch — the failure emits carry nothing else', () => {
    // server/server/app.py:4302 / 4311 / 4324
    for (const error of ['SLAM not initialized', 'No queries provided']) {
      const failed: DebugDetectError = { error };
      expect(summarize(failed)).toBe(`error:${error}`);
    }
  });

  it('accepts the empty-map early return (same shape, empty lists)', () => {
    // server/server/streaming_slam.py:1224-1230
    const empty: DebugDetectResponse = {
      queries: ['chair'],
      clip_thresholds: {},
      sam_thresholds: {},
      top_k: 3,
      frames: [],
      raw_detection_count: 0,
      deduped_detection_count: 0,
      detections: [],
      total_frames_scanned: 0,
      query_time_ms: 0,
    };
    expect(summarize(empty)).toBe('0/0');
  });

  it("models Python's None as null (not absent) on the nullable diagnostic fields", () => {
    // server/server/streaming_slam.py:1328 / 1332-1333 / 1354-1357 all emit the key with None.
    const sparse: DebugSamMaskDiag = {
      ...mask,
      mask_image: null,
      bbox_3d: null,
      has_3d_box: false,
      dedup_kept: null,
    };
    const skipped: DebugFrameDiag = {
      ...frame,
      thumbnail: null,
      resolution: null,
      sam_masks: [],
      sam_error: null,
      in_top_k: false,
      sam_skipped: true,
      detections_before_dedup: [],
    };
    expect(sparse.dedup_kept).toBeNull();
    expect(skipped.resolution).toBeNull();
    expect(skipped.sam_masks).toEqual([]);
  });

  it('carries the per-stage scores whose product is the ranked confidence', () => {
    // server/server/streaming_slam.py:1326 (combined) / 1369 (confidence)
    expect(detection.confidence).toBeCloseTo(detection.clip_score * detection.sam_score, 10);
    expect(mask.combined_score).toBeCloseTo(mask.score * mask.clip_score, 10);
  });
});

describe('error payload', () => {
  it('types the only code the server emits today', () => {
    // server/server/app.py:4051 — an oversized base64 frame is rejected and dropped.
    const payload: ServerToClientEvents[typeof SERVER_EVENTS.ERROR] = { error: 'frame_too_large' };
    expect(payload.error).toBe('frame_too_large');
  });

  it('stays an open string so a future server code does not break the contract', () => {
    const payload: ErrorPayload = { error: 'some_future_code' };
    expect(typeof payload.error).toBe('string');
  });
});
