import { describe, expect, it } from 'vitest';
import {
  REST_PATHS,
  SHARE_QUERY_PARAM,
  SHARE_TOKEN_SCOPE,
  buildEmbedUrl,
  PROJECTS_SHARE,
  PROJECTS_MANIFEST,
  PROJECT_TOKEN_PARAM,
  buildBuildingUrl,
  isApiErrorResponse,
  isAnchorSceneResponse,
  isClampSceneResponse,
  isObjectEditResponse,
  isDerivedLatestPointer,
} from '../rest';

describe('scene share / embed paths', () => {
  it('builds the splat + share route paths', () => {
    expect(REST_PATHS.SCENE_SPLAT_PLY('abc')).toBe('/api/scenes/abc/splat.ply');
    expect(REST_PATHS.SCENE_SHARE('abc')).toBe('/api/scenes/abc/share');
  });

  it('encodes scan ids in the route builders', () => {
    expect(REST_PATHS.SCENE_SPLAT_PLY('a/b')).toBe('/api/scenes/a%2Fb/splat.ply');
    expect(REST_PATHS.SCENE_SHARE('a b')).toBe('/api/scenes/a%20b/share');
  });

  it('builds an embed url with the token in the hash (not the query)', () => {
    const url = buildEmbedUrl('https://broker.example.com/', 'scan_1', 'tok.en');
    expect(url).toBe(
      `https://broker.example.com/embed.html#scan_id=scan_1&${SHARE_QUERY_PARAM}=tok.en`,
    );
    // token rides the fragment so it isn't sent on the document request
    expect(url.indexOf('#')).toBeLessThan(url.indexOf(SHARE_QUERY_PARAM));
    expect(url).not.toContain('?');
  });

  it('exposes the shared share-token constants', () => {
    expect(SHARE_QUERY_PARAM).toBe('share_token');
    expect(SHARE_TOKEN_SCOPE).toBe('scene:read');
  });
});

describe('building / project manifest paths', () => {
  it('exposes the PROJECTS_SHARE constant', () => {
    expect(PROJECTS_SHARE).toBe('/api/projects/share');
  });

  it('builds the manifest path with urlencoded client + project', () => {
    expect(PROJECTS_MANIFEST('acme', 'rooftop')).toBe(
      '/api/projects/manifest?client=acme&project=rooftop',
    );
  });

  it('encodes special characters in the manifest path', () => {
    expect(PROJECTS_MANIFEST('acme corp', 'floor 1/2')).toBe(
      '/api/projects/manifest?client=acme%20corp&project=floor%201%2F2',
    );
  });

  it('builds a building embed url with the token in the hash (not the query)', () => {
    const url = buildBuildingUrl('https://broker.example.com/', 'acme', 'rooftop', 'proj.tok');
    expect(url).toBe(
      'https://broker.example.com/building.html#client=acme&project=rooftop&token=proj.tok',
    );
    // token rides the fragment so it isn't sent on the document request
    expect(url.indexOf('#')).toBeLessThan(url.indexOf('token='));
    expect(url).not.toContain('?');
  });

  it('encodes special characters in building embed url params', () => {
    const url = buildBuildingUrl('https://broker.example.com', 'acme corp', 'q1/q2', 'tok.abc');
    expect(url).toContain('client=acme%20corp');
    expect(url).toContain('project=q1%2Fq2');
    expect(url).toContain('token=tok.abc');
  });

  it('strips trailing slash from origin in building embed url', () => {
    const url = buildBuildingUrl('https://broker.example.com/', 'acme', 'rooftop', 'tok');
    expect(url.startsWith('https://broker.example.com/building.html')).toBe(true);
    expect(url).not.toContain('//building.html');
  });

  it('exposes PROJECT_TOKEN_PARAM', () => {
    expect(PROJECT_TOKEN_PARAM).toBe('token');
  });
});

describe('Refine: metric anchor + auto-clamp paths', () => {
  it('builds the anchor + clamp route paths', () => {
    expect(REST_PATHS.SCENE_ANCHOR('abc')).toBe('/api/scenes/abc/anchor');
    expect(REST_PATHS.SCENE_CLAMP('abc')).toBe('/api/scenes/abc/clamp');
  });

  it('encodes scan ids in the anchor + clamp route builders', () => {
    expect(REST_PATHS.SCENE_ANCHOR('a/b')).toBe('/api/scenes/a%2Fb/anchor');
    expect(REST_PATHS.SCENE_CLAMP('a b')).toBe('/api/scenes/a%20b/clamp');
  });
});

describe('Detect: per-object edit path', () => {
  it('builds the object edit route path with the object index', () => {
    expect(REST_PATHS.SCENE_OBJECT('abc', 0)).toBe('/api/scenes/abc/objects/0');
    expect(REST_PATHS.SCENE_OBJECT('abc', 3)).toBe('/api/scenes/abc/objects/3');
  });

  it('encodes the scan id in the object edit route builder', () => {
    expect(REST_PATHS.SCENE_OBJECT('a/b', 2)).toBe('/api/scenes/a%2Fb/objects/2');
  });
});

describe('isObjectEditResponse', () => {
  const valid = {
    scan_id: 'scan_1',
    object_id: 0,
    object: {
      query: 'office chair',
      center: [0, 0, 0],
      extent: [0.5, 0.5, 1],
      confidence: 0.9,
      evidence: [],
      human_label: 'standing lamp',
      dismissed: false,
    },
  };

  it('accepts a well-formed response (original query + human_label present)', () => {
    expect(isObjectEditResponse(valid)).toBe(true);
    expect(isObjectEditResponse({ ...valid, object: { ...valid.object, dismissed: true } })).toBe(true);
  });

  it('rejects a response missing the object or its query', () => {
    const { object: _drop, ...rest } = valid;
    expect(isObjectEditResponse(rest)).toBe(false);
    expect(isObjectEditResponse({ ...valid, object: { center: [0, 0, 0] } })).toBe(false);
  });

  it('rejects a non-numeric object_id and non-object input without throwing', () => {
    expect(isObjectEditResponse({ ...valid, object_id: '0' })).toBe(false);
    expect(isObjectEditResponse(undefined)).toBe(false);
    expect(isObjectEditResponse('nope')).toBe(false);
  });
});

describe('SCENE_DERIVED derived-artifact read path', () => {
  it('strips a leading derived/ and preserves the key path structure', () => {
    expect(REST_PATHS.SCENE_DERIVED('abc', 'derived/anchor/123_ab/cloud.ply')).toBe(
      '/api/scenes/abc/derived/anchor/123_ab/cloud.ply',
    );
  });

  it('accepts a key that is already relative (no derived/ prefix)', () => {
    expect(REST_PATHS.SCENE_DERIVED('abc', 'clamp/9_zz/splat.ply')).toBe(
      '/api/scenes/abc/derived/clamp/9_zz/splat.ply',
    );
  });

  it('encodes the scan id and each key segment, never the separating slashes', () => {
    expect(REST_PATHS.SCENE_DERIVED('a b', 'derived/anchor/a b/cloud.ply')).toBe(
      '/api/scenes/a%20b/derived/anchor/a%20b/cloud.ply',
    );
  });
});

describe('isDerivedLatestPointer', () => {
  const anchor = {
    kind: 'anchor',
    cloud_key: 'derived/anchor/1_a/cloud.ply',
    trajectory_key: 'derived/anchor/1_a/trajectory.npz',
    splat_key: null,
    source_key: 'derived/anchor/1_a/cloud.ply',
    applied_at: '2026-07-17T00:00:00+00:00',
  };
  const clamp = {
    kind: 'clamp',
    cloud_key: null,
    trajectory_key: null,
    splat_key: 'derived/clamp/2_b/splat.ply',
    source_key: 'derived/clamp/2_b/splat.ply',
    applied_at: '2026-07-17T00:00:00+00:00',
  };

  it('accepts a well-formed anchor and clamp pointer (nullable per-type keys)', () => {
    expect(isDerivedLatestPointer(anchor)).toBe(true);
    expect(isDerivedLatestPointer(clamp)).toBe(true);
  });

  it('rejects a bad kind, empty/missing source_key, or a non-string key', () => {
    expect(isDerivedLatestPointer({ ...anchor, kind: 'nope' })).toBe(false);
    expect(isDerivedLatestPointer({ ...anchor, source_key: '' })).toBe(false);
    const { source_key: _drop, ...noSource } = anchor;
    expect(isDerivedLatestPointer(noSource)).toBe(false);
    expect(isDerivedLatestPointer({ ...anchor, cloud_key: 42 })).toBe(false);
  });

  it('rejects non-object input without throwing', () => {
    expect(isDerivedLatestPointer(null)).toBe(false);
    expect(isDerivedLatestPointer(undefined)).toBe(false);
    expect(isDerivedLatestPointer('nope')).toBe(false);
  });
});

describe('isApiErrorResponse', () => {
  it('accepts an error-only body', () => {
    expect(isApiErrorResponse({ error: 'not_found' })).toBe(true);
  });

  it('accepts an error + message body', () => {
    expect(isApiErrorResponse({ error: 'invalid_request', message: 'bad input' })).toBe(true);
  });

  it('rejects a non-string error or message, and non-object input', () => {
    expect(isApiErrorResponse({ error: 42 })).toBe(false);
    expect(isApiErrorResponse({ error: 'no_points', message: 42 })).toBe(false);
    expect(isApiErrorResponse(undefined)).toBe(false);
    expect(isApiErrorResponse('nope')).toBe(false);
  });
});

describe('isAnchorSceneResponse', () => {
  const valid = {
    scale_factor: 1.108,
    measured_distance: 1.0828,
    distance_m: 1.2,
    applied_at: '2026-07-11T12:00:00+00:00',
    calibrated_cloud_key: 'derived/anchor/123_abcd1234/cloud.ply',
    calibrated_trajectory_key: 'derived/anchor/123_abcd1234/trajectory.npz',
    calibrated_splat_key: null,
    gauge_span_before: 1.0828,
    gauge_span_after_m: 1.2,
    cloud_extent_before: 5.997,
    cloud_extent_after_m: 6.645,
  };

  it('accepts a well-formed response (nullable trajectory/splat keys included)', () => {
    expect(isAnchorSceneResponse(valid)).toBe(true);
  });

  it('accepts both calibrated keys being null', () => {
    expect(
      isAnchorSceneResponse({ ...valid, calibrated_trajectory_key: null, calibrated_splat_key: null }),
    ).toBe(true);
  });

  it('rejects a response missing a required numeric field', () => {
    const { scale_factor: _drop, ...rest } = valid;
    expect(isAnchorSceneResponse(rest)).toBe(false);
  });

  it('rejects non-object input without throwing', () => {
    expect(isAnchorSceneResponse(undefined)).toBe(false);
    expect(isAnchorSceneResponse('nope')).toBe(false);
  });
});

describe('isClampSceneResponse', () => {
  const valid = {
    clamped_gaussian_count: 1,
    scale_clamp_percentile: 99.0,
    cloud_key: 'derived/clamp/123_abcd1234/splat.ply',
    derived_splat_key: 'derived/clamp/123_abcd1234/splat.ply',
    max_scale_before: 50.0,
    max_scale_after: 0.01,
    gaussian_count: 300,
  };

  it('accepts a well-formed response', () => {
    expect(isClampSceneResponse(valid)).toBe(true);
  });

  it('rejects a response missing a required field', () => {
    const { gaussian_count: _drop, ...rest } = valid;
    expect(isClampSceneResponse(rest)).toBe(false);
  });

  it('rejects non-object input without throwing', () => {
    expect(isClampSceneResponse(undefined)).toBe(false);
    expect(isClampSceneResponse(42)).toBe(false);
  });
});
