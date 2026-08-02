import { describe, expect, it } from 'vitest';
import {
  EXPORT_FORMATS,
  EXPORT_SOURCE_ORIGINAL,
  SCENE_EXPORT_PATH,
  sceneExportDownloadFilename,
  isSceneExportErrorResponse,
  isIsaacUnavailable,
  isMetricScaleRequired,
  type ExportFormat,
} from '../exportHub';

/**
 * `exportHub.ts` now models the REAL, deployed `GET /api/scenes/<id>/export` route (see the
 * file's header comment). A successful response is a raw zip body, not JSON — so these tests
 * cover the frontend-owned pieces: the static format catalog (incl. which formats the route
 * can actually produce today), the path/filename builders, and the JSON error-body guard.
 */

describe('EXPORT_FORMATS', () => {
  it('lists exactly the three real formats from the export contract', () => {
    const formats = EXPORT_FORMATS.map((f) => f.format);
    expect(formats).toEqual(['openreality', 'groot_lerobot_v2', 'isaac_usd']);
  });

  it('every entry has a non-empty label, summary, and docs pointer', () => {
    for (const f of EXPORT_FORMATS) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.summary.length).toBeGreaterThan(0);
      expect(f.docs.length).toBeGreaterThan(0);
    }
  });

  it('marks all three formats as server-available (isaac_usd is un-501d)', () => {
    for (const f of EXPORT_FORMATS) {
      expect(f.serverAvailable).toBe(true);
    }
  });

  it('marks ONLY isaac_usd as gated on a metric anchor', () => {
    const isaac = EXPORT_FORMATS.find((f) => f.format === 'isaac_usd');
    expect(isaac?.requiresMetricAnchor).toBe(true);
    const openreality = EXPORT_FORMATS.find((f) => f.format === 'openreality');
    const groot = EXPORT_FORMATS.find((f) => f.format === 'groot_lerobot_v2');
    expect(openreality?.requiresMetricAnchor).toBeFalsy();
    expect(groot?.requiresMetricAnchor).toBeFalsy();
  });
});

describe('SCENE_EXPORT_PATH', () => {
  it('builds a query-formatted export path', () => {
    expect(SCENE_EXPORT_PATH('scan_123', 'isaac_usd')).toBe(
      '/api/scenes/scan_123/export?format=isaac_usd',
    );
  });

  it('URL-encodes the scan id', () => {
    expect(SCENE_EXPORT_PATH('scan/with spaces', 'openreality')).toBe(
      '/api/scenes/scan%2Fwith%20spaces/export?format=openreality',
    );
  });

  it('produces a distinct path per format', () => {
    const formats: ExportFormat[] = ['openreality', 'groot_lerobot_v2', 'isaac_usd'];
    const paths = new Set(formats.map((f) => SCENE_EXPORT_PATH('scan_1', f)));
    expect(paths.size).toBe(3);
  });

  it('omits ?source= when no selector is given (back-compat with 2-arg callers)', () => {
    expect(SCENE_EXPORT_PATH('scan_1', 'openreality')).toBe(
      '/api/scenes/scan_1/export?format=openreality',
    );
  });

  it('appends a URL-encoded &source= when a derived key is given', () => {
    expect(SCENE_EXPORT_PATH('scan_1', 'openreality', 'derived/anchor/1_a/cloud.ply')).toBe(
      '/api/scenes/scan_1/export?format=openreality&source=derived%2Fanchor%2F1_a%2Fcloud.ply',
    );
  });

  it('supports EXPORT_SOURCE_ORIGINAL to force the original geometry', () => {
    expect(EXPORT_SOURCE_ORIGINAL).toBe('original');
    expect(SCENE_EXPORT_PATH('scan_1', 'groot_lerobot_v2', EXPORT_SOURCE_ORIGINAL)).toBe(
      '/api/scenes/scan_1/export?format=groot_lerobot_v2&source=original',
    );
  });
});

describe('sceneExportDownloadFilename', () => {
  it('matches the server-side download_name convention', () => {
    expect(sceneExportDownloadFilename('scan_1', 'openreality')).toBe('scan-scan_1-openreality.zip');
    expect(sceneExportDownloadFilename('scan_1', 'groot_lerobot_v2')).toBe(
      'scan-scan_1-groot_lerobot_v2.zip',
    );
  });
});

describe('isSceneExportErrorResponse', () => {
  it('accepts every real error code the route returns', () => {
    for (const error of [
      'invalid_format',
      'invalid_request',
      'not_found',
      'no_trajectory',
      'no_points',
      'export_failed',
      'unknown_derived_key',
      'metric_scale_required',
      'isaac_unavailable',
    ]) {
      expect(isSceneExportErrorResponse({ error })).toBe(true);
      expect(isSceneExportErrorResponse({ error, message: 'some detail' })).toBe(true);
    }
  });

  it('rejects the retired not_implemented code (isaac_usd is now real)', () => {
    expect(isSceneExportErrorResponse({ error: 'not_implemented' })).toBe(false);
  });

  it('rejects an unknown error code', () => {
    expect(isSceneExportErrorResponse({ error: 'totally_made_up' })).toBe(false);
  });

  it('rejects a message that is not a string', () => {
    expect(isSceneExportErrorResponse({ error: 'not_found', message: 42 })).toBe(false);
  });

  it('rejects non-object input without throwing', () => {
    expect(isSceneExportErrorResponse(undefined)).toBe(false);
    expect(isSceneExportErrorResponse('nope')).toBe(false);
    expect(isSceneExportErrorResponse(null)).toBe(false);
  });
});

describe('isaac_usd error guards', () => {
  it('isIsaacUnavailable is true only for the isaac_unavailable body', () => {
    expect(isIsaacUnavailable({ error: 'isaac_unavailable', message: 'no usd-core' })).toBe(true);
    expect(isIsaacUnavailable({ error: 'metric_scale_required' })).toBe(false);
    expect(isIsaacUnavailable({ error: 'export_failed' })).toBe(false);
    expect(isIsaacUnavailable(undefined)).toBe(false);
    expect(isIsaacUnavailable(null)).toBe(false);
  });

  it('isMetricScaleRequired is true only for the metric_scale_required body', () => {
    expect(isMetricScaleRequired({ error: 'metric_scale_required' })).toBe(true);
    expect(isMetricScaleRequired({ error: 'isaac_unavailable' })).toBe(false);
    expect(isMetricScaleRequired('nope')).toBe(false);
  });
});
