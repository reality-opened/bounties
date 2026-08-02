import type { Plugin } from 'vite';

/**
 * Minimal, hand-written dev-only API mock for the Refine pilot page.
 *
 * This is NOT a copy of apps/webserver/vite.config.ts's `apiMockPlugin` (that file contains
 * client-name fixture comments + a lot of mock routes unrelated to this page — demo videos, the
 * export zip builder, the object-layer fixture server, etc. — see README.md "Which page, and
 * why"). Instead this extracts JUST the two routes the Refine stage's mocked actions call
 * (`POST /api/scenes/<id>/clamp` and `POST /api/scenes/<id>/anchor`), reimplemented from scratch
 * with generic sample data (scan_id `demo_walkthrough`, no client names anywhere).
 *
 * Response shapes mirror the real `ClampSceneResponse` / `AnchorSceneResponse`
 * (`@reality/protocol`'s `rest.ts`, not included in this kit — see src/types.ts for the trimmed
 * local mirror these responses satisfy).
 */
export function apiMockPlugin(): Plugin {
  const CLAMP_RE = /^\/api\/scenes\/([^/]+)\/clamp$/;
  const ANCHOR_RE = /^\/api\/scenes\/([^/]+)\/anchor$/;

  const json = (res: import('http').ServerResponse, status: number, body: unknown): void => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const readJsonBody = (req: import('http').IncomingMessage): Promise<Record<string, unknown>> =>
    new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk: Buffer) => (raw += chunk));
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });

  return {
    name: 'refine-pilot-api-mock',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const path = url.split('?')[0];

        const clampMatch = path.match(CLAMP_RE);
        if (req.method === 'POST' && clampMatch) {
          void readJsonBody(req).then((body) => {
            let percentile = 99.0;
            if (body.percentile !== undefined) {
              const p = Number(body.percentile);
              if (!Number.isFinite(p)) {
                return json(res, 400, { error: 'invalid_request', message: `'percentile' must be a number, got ${body.percentile}` });
              }
              percentile = p;
            }
            // Mirrors a synthetic 300-gaussian scan with one spike at scale 50.0, the rest at
            // 0.01 — so a p99 clamp removes exactly the one outlier.
            return json(res, 200, {
              clamped_gaussian_count: 1,
              scale_clamp_percentile: percentile,
              derived_splat_key: `derived/clamp/${Date.now()}_mock/splat.ply`,
              max_scale_before: 50.0,
              max_scale_after: 0.01,
              gaussian_count: 300,
            });
          });
          return;
        }

        const anchorMatch = path.match(ANCHOR_RE);
        if (req.method === 'POST' && anchorMatch) {
          void readJsonBody(req).then((body) => {
            const pa = body.point_a;
            const pb = body.point_b;
            const distanceM = Number(body.distance_m);
            if (!Array.isArray(pa) || pa.length !== 3 || !Array.isArray(pb) || pb.length !== 3) {
              return json(res, 400, { error: 'invalid_request', message: "'point_a' and 'point_b' must be [x, y, z]" });
            }
            if (!Number.isFinite(distanceM) || distanceM <= 0) {
              return json(res, 400, { error: 'invalid_request', message: "'distance_m' must be a positive finite number" });
            }
            const dx = (pa[0] as number) - (pb[0] as number);
            const dy = (pa[1] as number) - (pb[1] as number);
            const dz = (pa[2] as number) - (pb[2] as number);
            const measured = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (measured < 1e-6) {
              return json(res, 400, {
                error: 'invalid_request',
                message: `measured point-pair distance ${measured} is degenerate (< 1e-06); pick two points clearly apart`,
              });
            }
            const scaleFactor = distanceM / measured;
            const extentBefore = Math.sqrt(4.2 * 4.2 + 2.6 * 2.6 + 3.4 * 3.4); // demo scene bbox diagonal
            return json(res, 200, {
              scale_factor: scaleFactor,
              applied_at: new Date().toISOString(),
              calibrated_cloud_key: `derived/anchor/${Date.now()}_mock/cloud.ply`,
              gauge_span_before: measured,
              gauge_span_after_m: measured * scaleFactor,
              cloud_extent_before: extentBefore,
              cloud_extent_after_m: extentBefore * scaleFactor,
            });
          });
          return;
        }

        next();
      });
    },
  };
}
