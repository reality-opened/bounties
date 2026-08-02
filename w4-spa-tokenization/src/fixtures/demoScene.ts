import type { DemoScene } from '../types';

/**
 * Fully invented demo scan — a small office, no real scan data. Mirrors the shape (and the
 * spirit) of the synthetic demo scene the real app's dev-only API mock builds in
 * apps/webserver/vite.config.ts (`synthDemoScene`), trimmed to the fields this page's
 * findings/actions read. `scan_id` is a generic placeholder, not a real scan.
 */
export const demoScene: DemoScene = {
  scan_id: 'demo_walkthrough',
  has_splat: true,
  report: {
    degraded: false,
  },
  facts: {
    units_note: 'Coordinates and sizes are up-to-scale (SLAM world frame); not guaranteed metric.',
    coverage_estimate: 0.52,
    objects: [
      { query: 'desk', center: [0, 0.4, 0], confidence: 0.91 },
      { query: 'office chair', center: [-0.9, 0.45, 0.6], confidence: 0.86 },
      { query: 'monitor', center: [0.1, 0.9, -0.2], confidence: 0.79 },
      {
        query: 'whiteboard',
        center: [0, 1.3, -1.65],
        confidence: 0.41,
        description: { title: 'wall-mounted whiteboard', color: 'white' },
      },
    ],
  },
};
