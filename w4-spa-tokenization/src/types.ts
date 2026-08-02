/**
 * Kit-local types for the Refine-stage pilot page.
 *
 * The real app's equivalents live in `@reality/protocol` (web/packages/protocol/types.ts +
 * rest.ts) and are re-exported through apps/webserver/src/types.ts. Pulling the full protocol
 * package in here just to render one stage would drag in a lot of unrelated contract surface
 * (auth, binary frames, export hub, object layer, …), so this kit defines a small, hand-trimmed
 * subset that mirrors the REAL shapes field-for-field for the fields this page actually reads.
 * If you extend this page to need more of the real scene shape, prefer widening these types over
 * inventing new field names — keep them shaped like the real contract.
 */

export interface SceneObjectSummary {
  /** The raw detection label (what the backend's open-vocabulary detector searched for). */
  query: string;
  confidence?: number;
  /** Fine-grained VLM description, when available — same shape as the real ObjectDescription. */
  description?: {
    title?: string;
    brand?: string;
    model?: string;
    color?: string;
  };
  /** World-frame center, needed for the anchor action's two-point picker. */
  center: [number, number, number];
}

/** Trimmed mirror of the real PersistedScene (protocol/types.ts) — only the fields the Refine
 *  stage's findings + actions actually read. */
export interface DemoScene {
  scan_id: string;
  has_splat: boolean;
  report: {
    degraded?: boolean;
  };
  facts: {
    units_note?: string;
    coverage_estimate?: number;
    objects: SceneObjectSummary[];
  };
}

/** Mirrors the real ClampSceneResponse (protocol/rest.ts). */
export interface ClampSceneResponse {
  clamped_gaussian_count: number;
  scale_clamp_percentile: number;
  derived_splat_key: string;
  max_scale_before: number;
  max_scale_after: number;
  gaussian_count: number;
}

/** Mirrors the real AnchorSceneResponse (protocol/rest.ts), trimmed to the numeric before/after
 *  fields this page renders (drops the nullable trajectory/splat derived keys — this kit never
 *  loads a 3D viewer to show them in). */
export interface AnchorSceneResponse {
  scale_factor: number;
  gauge_span_before: number;
  gauge_span_after_m: number;
  cloud_extent_before: number;
  cloud_extent_after_m: number;
  applied_at: string;
  calibrated_cloud_key: string;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.error === 'string' && (o.message === undefined || typeof o.message === 'string');
}
