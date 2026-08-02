import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OBJECT_LAYER_DISCLAIMER,
  OBJECT_LAYER_SCHEMA_VERSION,
  convertSceneInventory,
  isObjectLayerManifest,
  normalizeQualityTier,
  parseObjectLayerManifest,
  resolveAssetUrl,
  type ObjectLayerItem,
  type ObjectLayerManifest,
  type SceneInventory,
} from '../objectLayer';

const IDENTITY: number[][] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function item(overrides: Partial<ObjectLayerItem> = {}): ObjectLayerItem {
  return {
    id: 'office_chair',
    label: 'Office chair',
    obb: { center: [1, 2, 3], extents: [0.6, 0.9, 0.6], rotation: IDENTITY },
    quality: 'good',
    asset_url: 'https://cdn.example/office_chair.glb',
    provenance: 'AI-completed — envelope-verified',
    caveats: [],
    source_frame: 'submap 00225 · frame 7',
    submap: '00225',
    ...overrides,
  };
}

function manifest(overrides: Partial<ObjectLayerManifest> = {}): ObjectLayerManifest {
  return { version: 1, scan_id: 'scan_abc', objects: [item()], ...overrides };
}

describe('object layer manifest guard', () => {
  it('accepts a well-formed manifest', () => {
    expect(isObjectLayerManifest(manifest())).toBe(true);
  });

  it('accepts an empty object list and optional fields absent', () => {
    expect(isObjectLayerManifest({ version: 1, objects: [] })).toBe(true);
  });

  it('accepts a low-tier object with no asset_url (box-only)', () => {
    const m = manifest({ objects: [item({ quality: 'low', asset_url: undefined })] });
    expect(isObjectLayerManifest(m)).toBe(true);
  });

  it('rejects a missing version', () => {
    expect(isObjectLayerManifest({ objects: [] })).toBe(false);
  });

  it('rejects a bad quality tier', () => {
    const m = manifest({ objects: [item({ quality: 'excellent' as never })] });
    expect(isObjectLayerManifest(m)).toBe(false);
  });

  it('rejects an OBB with a non-3x3 rotation', () => {
    const bad = item({ obb: { center: [0, 0, 0], extents: [1, 1, 1], rotation: [[1, 0, 0]] } });
    expect(isObjectLayerManifest(manifest({ objects: [bad] }))).toBe(false);
  });

  it('rejects an OBB with a 2-element centre', () => {
    const bad = item({ obb: { center: [0, 0], extents: [1, 1, 1], rotation: IDENTITY } });
    expect(isObjectLayerManifest(manifest({ objects: [bad] }))).toBe(false);
  });

  it('rejects non-string caveats', () => {
    const bad = item({ caveats: [1 as never] });
    expect(isObjectLayerManifest(manifest({ objects: [bad] }))).toBe(false);
  });
});

describe('parseObjectLayerManifest', () => {
  it('round-trips a valid manifest object', () => {
    const m = manifest();
    expect(parseObjectLayerManifest(m)).toEqual(m);
  });

  it('parses a JSON string', () => {
    const m = manifest();
    expect(parseObjectLayerManifest(JSON.stringify(m))).toEqual(m);
  });

  it('returns null (never throws) on garbage', () => {
    expect(parseObjectLayerManifest('{not json')).toBeNull();
    expect(parseObjectLayerManifest(null)).toBeNull();
    expect(parseObjectLayerManifest(42)).toBeNull();
    expect(parseObjectLayerManifest({ version: 1 })).toBeNull();
  });
});

describe('normalizeQualityTier', () => {
  it('maps the EXP-19/EXP-20 vocabulary', () => {
    expect(normalizeQualityTier('GOOD')).toBe('good');
    expect(normalizeQualityTier('usable')).toBe('usable');
    expect(normalizeQualityTier('LOW')).toBe('low');
  });

  it('falls back to low for unshippable / unknown labels', () => {
    expect(normalizeQualityTier('STILL-CHIMERA')).toBe('low');
    expect(normalizeQualityTier('NO-GO')).toBe('low');
    expect(normalizeQualityTier(undefined)).toBe('low');
    expect(normalizeQualityTier('')).toBe('low');
  });
});

describe('resolveAssetUrl', () => {
  it('joins a bare relative path onto the base (trailing slash tolerant)', () => {
    expect(resolveAssetUrl('office_chair.glb', 'https://cdn/x')).toBe('https://cdn/x/office_chair.glb');
    expect(resolveAssetUrl('sub/office_chair.glb', 'https://cdn/x/')).toBe('https://cdn/x/sub/office_chair.glb');
  });

  it('passes absolute urls and root-relative paths through unchanged', () => {
    expect(resolveAssetUrl('https://a/b.glb', 'https://cdn')).toBe('https://a/b.glb');
    // A root-relative path is already fetchable same-origin — do not re-base it.
    expect(resolveAssetUrl('/abs/b.glb', 'https://cdn/x')).toBe('/abs/b.glb');
    expect(resolveAssetUrl('/abs/b.glb')).toBe('/abs/b.glb');
    expect(resolveAssetUrl(undefined, 'https://cdn')).toBeUndefined();
  });
});

describe('convertSceneInventory (EXP-20 → manifest)', () => {
  const inventory: SceneInventory = {
    scan_id: 'demo_walkthrough',
    generated_at: '2026-07-07T00:00:00Z',
    frame: 'global up-to-scale world; not metric',
    objects: [
      {
        id: 'office_chair',
        label_guess: 'office chair',
        submap: '00225',
        best_frame: 7,
        quality: 'GOOD',
        asset_path: 'office_chair/asset.glb',
        provenance: 'AI-completed — envelope-verified',
        world_obb: { center: [1, 2, 3], extents: [0.6, 0.9, 0.6], rotation: IDENTITY },
      },
      {
        id: 'monitor',
        label: 'Monitor',
        submap: '00225',
        best_frame: 7,
        quality: 'USABLE',
        glb: 'monitor/asset.glb',
        caveat: 'Tight mask dropped the stand — screen panel only.',
        world_obb: { center: [4, 5, 6], extent: [0.5, 0.3, 0.05], rotation: IDENTITY },
      },
      {
        id: 'ghost',
        quality: 'STILL-CHIMERA',
        // no world_obb → un-placeable, must be skipped
      },
    ],
  };

  it('produces a valid, well-formed manifest', () => {
    const m = convertSceneInventory(inventory, { assetBaseUrl: 'https://cdn/scan/assets' });
    expect(isObjectLayerManifest(m)).toBe(true);
    expect(m.version).toBe(OBJECT_LAYER_SCHEMA_VERSION);
    expect(m.scan_id).toBe('demo_walkthrough');
  });

  it('skips objects without a placeable OBB', () => {
    const m = convertSceneInventory(inventory);
    expect(m.objects.map((o) => o.id)).toEqual(['office_chair', 'monitor']);
  });

  it('resolves asset urls, normalizes quality, and derives source_frame + label', () => {
    const m = convertSceneInventory(inventory, { assetBaseUrl: 'https://cdn/scan/assets' });
    const chair = m.objects[0];
    expect(chair.label).toBe('office chair'); // from label_guess fallback
    expect(chair.quality).toBe('good');
    expect(chair.asset_url).toBe('https://cdn/scan/assets/office_chair/asset.glb');
    expect(chair.source_frame).toBe('submap 00225 · frame 7');
  });

  it('accepts the `extent` alias and coerces a single caveat to an array', () => {
    const m = convertSceneInventory(inventory);
    const monitor = m.objects[1];
    expect(monitor.obb.extents).toEqual([0.5, 0.3, 0.05]);
    expect(monitor.caveats).toEqual(['Tight mask dropped the stand — screen panel only.']);
    expect(monitor.quality).toBe('usable');
  });

  it('applies the default disclaimer when none is provided', () => {
    const m = convertSceneInventory(inventory);
    expect(m.disclaimer).toBe(DEFAULT_OBJECT_LAYER_DISCLAIMER);
  });
});

describe('convertSceneInventory — EXP-20 scene_inventory.json real-schema mirror', () => {
  // Synthetic record mirroring the EXACT field NAMES/TYPES of EXP-20's
  // results_fullscene/scene_inventory.json (world_obb.axes_rows, extent + half_extent, dict `asset`
  // with {glb, ply, render_eye, demo_glb}, UPPER-CASE `quality_tier`, internal `notes`), verified
  // field-for-field against one real record on 2026-07-07. All numbers/labels are FABRICATED — no
  // real-scan-derived coordinates or labels are committed here.

  // `axes_rows` gives the box axes as ROWS; the converter must transpose to columns-are-axes.
  const AXES_ROWS: number[][] = [
    [0, 1, 0],
    [-1, 0, 0],
    [0, 0, 1],
  ];
  // Columns-are-axes == transpose of AXES_ROWS above.
  const AXES_COLS: number[][] = [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ];

  const inventory = {
    experiment: 'EXP-XX synthetic fixture',
    generated_utc: '2026-07-07T00:00:00Z',
    confidential: 'synthetic — safe to commit',
    scene: 'synthetic_scene: fabricated numbers only',
    frame: 'global up-to-scale world (per-submap sim3 composed); NOT metric',
    counts: { objects_total: 3, GOOD: 1, USABLE: 1, LOW: 1 },
    provenance_note: 'generative — envelope-verified, functional parts unverified',
    objects: [
      {
        // GOOD: asset dict has demo_glb → world-baked GLB is preferred over raw glb.
        id: 'widget',
        inst_id: 1,
        label_guess: 'widget',
        curated: true,
        submap: '00000',
        best_frame: 10,
        n_views: 4,
        quality_tier: 'GOOD',
        asset: {
          glb: 'results_v2/widget/asset.glb',
          ply: 'results_v2/widget/asset.ply',
          render_eye: 'results_v2/widget/render_eye.png',
          demo_glb: 'demo2_viewer_stage/assets/widget.glb',
        },
        comparison_vs_measured: {
          centroid_offset_frac_diag: 0.05,
          scale_ratio_volumetric: 1.1,
          rotation_delta_deg: 3.0,
        },
        clip: null,
        notes: 'INTERNAL: v2 slightly tighter than v1; do not surface to the customer.',
        world_obb: {
          frame: 'global up-to-scale world',
          center: [1, 2, 3],
          axes_rows: AXES_ROWS,
          half_extent: [0.25, 0.5, 0.75],
          corners: [
            [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
            [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
          ],
          diag: 1.87,
          extent: [0.5, 1.0, 1.5],
          sim3_scale: 1.0,
        },
        provenance: 'generative — envelope-verified, functional parts unverified',
        renders_mesh_by_default: true,
      },
      {
        // USABLE: demo_glb is null (as real LOW/edge records emit) → falls back to raw glb.
        id: 'gizmo',
        inst_id: 2,
        label_guess: 'gizmo',
        curated: false,
        submap: '00017',
        best_frame: 22,
        n_views: 2,
        quality_tier: 'USABLE',
        asset: {
          glb: 'results_v2/gizmo/asset.glb',
          ply: 'results_v2/gizmo/asset.ply',
          render_eye: 'results_v2/gizmo/render_eye.png',
          demo_glb: null,
        },
        clip: null,
        notes: 'INTERNAL: partial mask coverage.',
        world_obb: {
          frame: 'global up-to-scale world',
          center: [4, 5, 6],
          axes_rows: IDENTITY,
          half_extent: [0.1, 0.2, 0.3],
          extent: [0.2, 0.4, 0.6],
          diag: 0.75,
          sim3_scale: 1.0,
        },
        provenance: 'generative — envelope-verified',
        renders_mesh_by_default: false,
      },
      {
        // LOW: no usable GLB in the asset dict → kept, but box-only (asset_url undefined, NOT skipped).
        id: 'blob',
        inst_id: 3,
        label_guess: 'blob',
        curated: false,
        submap: '00034',
        best_frame: 30,
        n_views: 1,
        quality_tier: 'LOW',
        asset: {
          glb: null,
          ply: 'results_v2/blob/asset.ply',
          render_eye: 'results_v2/blob/render_eye.png',
          demo_glb: null,
        },
        clip: null,
        notes: 'INTERNAL: chimeric; box-only.',
        world_obb: {
          frame: 'global up-to-scale world',
          center: [7, 8, 9],
          axes_rows: IDENTITY,
          half_extent: [1, 1, 1],
          extent: [2, 2, 2],
          diag: 3.46,
          sim3_scale: 1.0,
        },
        provenance: 'generative — envelope-verified',
        renders_mesh_by_default: false,
      },
    ],
  };

  // Cast: this literal carries the FULL real schema (many fields the converter never reads), so it is
  // treated as untyped inventory JSON at the trust boundary — exactly how the real file arrives.
  const raw = inventory as unknown as SceneInventory;

  it('places every object — the axes_rows OBB is no longer null (rotation-skip regression)', () => {
    const m = convertSceneInventory(raw);
    expect(m.objects.map((o) => o.id)).toEqual(['widget', 'gizmo', 'blob']);
    expect(isObjectLayerManifest(m)).toBe(true);
  });

  it('transposes world_obb.axes_rows into a columns-are-axes rotation', () => {
    const m = convertSceneInventory(raw);
    expect(m.objects[0].obb.rotation).toEqual(AXES_COLS);
    // A pre-transposed `rotation`, if the emitter ever supplies one, wins over axes_rows.
    const withRotation = { objects: [{ ...inventory.objects[1], world_obb: { ...inventory.objects[1].world_obb, rotation: AXES_COLS } }] };
    const m2 = convertSceneInventory(withRotation as unknown as SceneInventory);
    expect(m2.objects[0].obb.rotation).toEqual(AXES_COLS);
  });

  it('uses the FULL `extent`, not half_extent (extent === 2× half_extent for this record)', () => {
    const m = convertSceneInventory(raw);
    const widget = m.objects[0];
    expect(widget.obb.extents).toEqual([0.5, 1.0, 1.5]);
    const half = inventory.objects[0].world_obb.half_extent;
    expect(widget.obb.extents).toEqual(half.map((h) => h * 2));
    // Guard against a half-extent regression: the emitted extents must NOT equal half_extent.
    expect(widget.obb.extents).not.toEqual(half);
  });

  it('reads the dict `asset`: prefers demo_glb, falls back to glb, box-only when neither', () => {
    const m = convertSceneInventory(raw, { assetBaseUrl: 'https://cdn/scan' });
    expect(m.objects[0].asset_url).toBe('https://cdn/scan/demo2_viewer_stage/assets/widget.glb'); // demo_glb wins
    expect(m.objects[1].asset_url).toBe('https://cdn/scan/results_v2/gizmo/asset.glb'); // demo_glb null → glb
    expect(m.objects[2].asset_url).toBeUndefined(); // no glb/demo_glb → kept, box-only
  });

  it('normalizes the UPPER-CASE quality_tier vocabulary', () => {
    const m = convertSceneInventory(raw);
    expect(m.objects.map((o) => o.quality)).toEqual(['good', 'usable', 'low']);
  });

  it('does NOT surface internal `notes` as caveats (curated at regen time)', () => {
    const m = convertSceneInventory(raw);
    expect(m.objects.every((o) => o.caveats.length === 0)).toBe(true);
  });

  it('derives label from label_guess and source_frame from submap · best_frame', () => {
    const m = convertSceneInventory(raw);
    expect(m.objects[0].label).toBe('widget');
    expect(m.objects[0].source_frame).toBe('submap 00000 · frame 10');
    expect(m.objects[0].submap).toBe('00000');
  });
});
