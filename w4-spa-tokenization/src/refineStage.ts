import { escapeHtml } from './util';
import { isApiErrorResponse } from './types';
import type { AnchorSceneResponse, ClampSceneResponse, DemoScene, SceneObjectSummary } from './types';

/**
 * Refine-stage pilot page — ADAPTED from apps/webserver/src/workflow/stages/refine.ts (the
 * production "Refine" stage of the six-stage workflow page), which is one of two CSS scopes the
 * W4 bounty kit README allows as a fallback when the originally-scoped summary/report page turned
 * out to import the live socket layer end-to-end (see ../README.md "Which page, and why").
 *
 * WHAT'S KEPT (same markup structure + CSS classes as the real stage, so the CSS you're
 * tokenizing is representative):
 *   - Quality findings list, computed from real scan facts (never a placeholder score) —
 *     `computeFindings` below is copied verbatim from the production file.
 *   - Auto-clamp action (POST .../clamp) with its honest numeric before/after.
 *   - Metric-anchor action (POST .../anchor), DETECTED-OBJECT-CENTERS mode only.
 *
 * WHAT'S DROPPED (needs the shared Three.js `SceneManager` / a live 3D viewer, which needs the
 * socket-connected workflow page this kit is explicitly avoiding — see README):
 *   - The free-form "click two points in the 3D viewer" anchor mode.
 *   - The post-action "show in 3D viewer" before/after render (original vs. calibrated/clamped
 *     point cloud or splat).
 *   - The six-stage stepper / stage-switching chrome (workflow.ts) — this page renders ONLY the
 *     Refine panel, standalone.
 *
 * The numeric before/after (the part that's kept) is the same "never fabricates a number" honesty
 * contract as production: it stays `— -> —` until a real mock action succeeds.
 */

export type FindingSeverity = 'warn' | 'info';

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

const LOW_CONFIDENCE = 0.5;
const LOW_COVERAGE = 0.6;

/** Derive quality findings from the scan's real facts. Never invents a number.
 *  (Copied verbatim from workflow/stages/refine.ts::computeFindings.) */
export function computeFindings(scene: DemoScene): Finding[] {
  const findings: Finding[] = [];
  const facts = scene.facts;
  const report = scene.report;

  const unitsNote = facts?.units_note ?? '';
  if (/up-to-scale|not guaranteed metric|not metric/i.test(unitsNote)) {
    findings.push({
      id: 'scale-unanchored',
      severity: 'info',
      title: 'Scale unanchored',
      detail: unitsNote || 'Coordinates are relative (SLAM world frame), not metric.',
    });
  }

  const coverage = facts?.coverage_estimate;
  if (typeof coverage === 'number' && coverage < LOW_COVERAGE) {
    findings.push({
      id: 'coverage-gap',
      severity: 'warn',
      title: 'Coverage gap',
      detail: `Estimated scene coverage is ${Math.round(coverage * 100)}% — parts of the space may be missing or thin.`,
    });
  }

  if (report?.degraded) {
    findings.push({
      id: 'report-degraded',
      severity: 'warn',
      title: 'Report degraded',
      detail: 'The language report model was unavailable; this scan shipped a fact-only summary.',
    });
  }

  const objects = facts?.objects ?? [];
  const lowConfidence = objects.filter((o) => typeof o.confidence === 'number' && o.confidence < LOW_CONFIDENCE);
  if (lowConfidence.length > 0) {
    findings.push({
      id: 'low-confidence-objects',
      severity: 'info',
      title: `${lowConfidence.length} low-confidence detection${lowConfidence.length === 1 ? '' : 's'}`,
      detail: `${lowConfidence.length} of ${objects.length} detected object(s) are below ${Math.round(LOW_CONFIDENCE * 100)}% confidence.`,
    });
  }

  if (objects.length === 0) {
    findings.push({
      id: 'no-objects',
      severity: 'warn',
      title: 'No objects detected',
      detail: 'The offline detection pass found nothing in this scan.',
    });
  }

  return findings;
}

type RefineResult =
  | { kind: 'clamp'; data: ClampSceneResponse }
  | { kind: 'anchor'; data: AnchorSceneResponse };

function findingRow(f: Finding): string {
  return `
    <li class="wf-finding wf-finding-${f.severity}">
      <span class="wf-finding-icon" aria-hidden="true">${f.severity === 'warn' ? '⚠' : 'ⓘ'}</span>
      <div class="wf-finding-body">
        <div class="wf-finding-title">${escapeHtml(f.title)}</div>
        <div class="wf-finding-detail">${escapeHtml(f.detail)}</div>
      </div>
    </li>`;
}

function objectLabel(o: SceneObjectSummary): string {
  return o.description?.title || o.query || 'Unknown object';
}

function renderBeforeAfterHtml(result: RefineResult | null): string {
  if (!result) {
    return `
      <div class="wf-before-after wf-before-after-inert">
        <div class="wf-ba-col">
          <span class="wf-ba-label">Before</span>
          <span class="wf-ba-value">—</span>
        </div>
        <div class="wf-ba-arrow" aria-hidden="true">&rarr;</div>
        <div class="wf-ba-col">
          <span class="wf-ba-label">After</span>
          <span class="wf-ba-value">—</span>
        </div>
      </div>`;
  }

  if (result.kind === 'clamp') {
    const d = result.data;
    return `
      <div class="wf-before-after">
        <div class="wf-ba-col">
          <span class="wf-ba-label">Max gaussian scale (before)</span>
          <span class="wf-ba-value">${d.max_scale_before.toPrecision(4)}</span>
        </div>
        <div class="wf-ba-arrow" aria-hidden="true">&rarr;</div>
        <div class="wf-ba-col">
          <span class="wf-ba-label">Max gaussian scale (after)</span>
          <span class="wf-ba-value">${d.max_scale_after.toPrecision(4)}</span>
        </div>
      </div>
      <p class="wf-ba-meta">Clamped ${d.clamped_gaussian_count.toLocaleString()} of ${d.gaussian_count.toLocaleString()}
        gaussians at the p${d.scale_clamp_percentile} scale threshold. Derived splat key:
        <code>${escapeHtml(d.derived_splat_key)}</code> (original <code>splat.ply</code> untouched).</p>`;
  }

  const d = result.data;
  return `
    <div class="wf-before-after">
      <div class="wf-ba-col">
        <span class="wf-ba-label">Gauge span (before)</span>
        <span class="wf-ba-value">${d.gauge_span_before.toPrecision(4)} units</span>
      </div>
      <div class="wf-ba-arrow" aria-hidden="true">&rarr;</div>
      <div class="wf-ba-col">
        <span class="wf-ba-label">Gauge span (after)</span>
        <span class="wf-ba-value">${d.gauge_span_after_m.toPrecision(4)} m</span>
      </div>
    </div>
    <p class="wf-ba-meta">Scale factor <strong>${d.scale_factor.toPrecision(4)} m/unit</strong> — whole-cloud extent
      ${d.cloud_extent_before.toPrecision(4)} units &rarr; ${d.cloud_extent_after_m.toPrecision(4)} m. Applied
      ${escapeHtml(new Date(d.applied_at).toLocaleString())}. Derived cloud key:
      <code>${escapeHtml(d.calibrated_cloud_key)}</code> (original <code>cloud.npz</code> untouched).</p>`;
}

export function renderRefineStage(container: HTMLElement, scene: DemoScene): void {
  const findings = computeFindings(scene);
  const findingsHtml = findings.length
    ? `<ul class="wf-findings">${findings.map(findingRow).join('')}</ul>`
    : '<p class="wf-empty">No quality findings on this scan — nothing flagged.</p>';

  const objects = scene.facts?.objects ?? [];
  const hasSplat = scene.has_splat ?? false;
  // This kit's trimmed Refine page only supports the detected-object-centers anchor mode (no 3D
  // viewer to free-pick points on — see the file header for why).
  const canAnchor = objects.length >= 2;
  const objectOptionsHtml = objects
    .map((o, i) => `<option value="${i}">${escapeHtml(objectLabel(o))}</option>`)
    .join('');

  container.innerHTML = `
    <div class="wf-panel">
      <h2 class="wf-panel-title">Refine</h2>
      <p class="wf-panel-sub">Quality findings, computed from this scan's real report + facts — never a placeholder score.</p>

      <h3 class="wf-panel-h3">Findings</h3>
      ${findingsHtml}

      <h3 class="wf-panel-h3">Actions</h3>
      <ul class="wf-actions">
        <li class="wf-action">
          <div class="wf-action-row">
            <button class="wf-action-btn" id="wfClampBtn" type="button" ${hasSplat ? '' : 'disabled'}
              title="${hasSplat ? '' : escapeHtml('This scan has no 3DGS splat to clamp.')}">Auto-clamp</button>
            <label class="wf-inline-label">Percentile
              <input class="wf-number-input" id="wfClampPercentile" type="number" min="0" max="100" step="0.1" value="99.0" ${hasSplat ? '' : 'disabled'} />
            </label>
          </div>
          <p class="wf-action-desc">POST /api/scenes/&lt;id&gt;/clamp — pulls the top-percentile per-gaussian 3DGS
            scale tail down to remove render spikes/floaters. Writes a NEW derived splat; the original
            <code>splat.ply</code> is never touched.</p>
          <p class="wf-panel-error" id="wfClampError"></p>
        </li>

        <li class="wf-action">
          <button class="wf-action-btn" id="wfAnchorToggle" type="button" ${canAnchor ? '' : 'disabled'}
            title="${canAnchor ? '' : escapeHtml('Needs at least two detected objects.')}">Metric anchor&hellip;</button>
          <p class="wf-action-desc">POST /api/scenes/&lt;id&gt;/anchor — define a gauge from two detected-object
            centers and enter the real-world distance between them to calibrate scale
            (<code>scale_factor = distance_m / measured</code>).</p>
          <div class="wf-inline-form" id="wfAnchorForm" hidden>
            <div class="wf-form-row">
              <label class="wf-form-label">Point A
                <select class="wf-select" id="wfAnchorA">${objectOptionsHtml}</select>
              </label>
              <label class="wf-form-label">Point B
                <select class="wf-select" id="wfAnchorB">${objectOptionsHtml}</select>
              </label>
            </div>
            <p class="wf-note">Uses this scan's detected-object centers as the two points.</p>
            <div class="wf-form-row">
              <label class="wf-form-label">Real-world distance between them (m)
                <input class="wf-number-input" id="wfAnchorDistance" type="number" min="0" step="0.01" placeholder="e.g. 1.20" />
              </label>
            </div>
            <div class="wf-form-row">
              <button class="wf-action-btn" id="wfAnchorApply" type="button">Apply anchor</button>
              <button class="wf-mini-btn" id="wfAnchorCancel" type="button">Cancel</button>
            </div>
            <p class="wf-panel-error" id="wfAnchorError"></p>
          </div>
        </li>
      </ul>

      <h3 class="wf-panel-h3">Before / after</h3>
      <div id="wfBeforeAfter">${renderBeforeAfterHtml(null)}</div>
      <p class="wf-note">The numeric before/after populates after a real (mocked) action succeeds — never a
        placeholder. The production stage also re-renders the derived geometry in a live 3D viewer for a visual
        before/after; that part isn't included in this standalone kit (see the file header).</p>
    </div>`;

  const beforeAfterEl = container.querySelector<HTMLElement>('#wfBeforeAfter');
  const setBeforeAfter = (result: RefineResult | null): void => {
    if (beforeAfterEl) beforeAfterEl.innerHTML = renderBeforeAfterHtml(result);
  };

  // ── Auto-clamp ──
  const clampBtn = container.querySelector<HTMLButtonElement>('#wfClampBtn');
  const clampPercentileInput = container.querySelector<HTMLInputElement>('#wfClampPercentile');
  const clampErrorEl = container.querySelector<HTMLElement>('#wfClampError');

  clampBtn?.addEventListener('click', async () => {
    if (!clampBtn) return;
    if (clampErrorEl) clampErrorEl.textContent = '';
    const raw = clampPercentileInput?.value ?? '';
    const percentile = raw.trim() === '' ? undefined : Number(raw);
    if (percentile !== undefined && !Number.isFinite(percentile)) {
      if (clampErrorEl) clampErrorEl.textContent = "'Percentile' must be a number.";
      return;
    }

    const originalLabel = clampBtn.textContent;
    clampBtn.disabled = true;
    clampBtn.textContent = 'Clamping…';
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(scene.scan_id)}/clamp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(percentile === undefined ? {} : { percentile }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isApiErrorResponse(body)
          ? body.message || `Auto-clamp failed: ${body.error}`
          : `Auto-clamp failed (HTTP ${res.status}).`;
        if (clampErrorEl) clampErrorEl.textContent = msg;
        return;
      }
      setBeforeAfter({ kind: 'clamp', data: body as ClampSceneResponse });
    } catch {
      if (clampErrorEl) clampErrorEl.textContent = 'Auto-clamp failed (network error).';
    } finally {
      clampBtn.disabled = false;
      clampBtn.textContent = originalLabel;
    }
  });

  // ── Metric anchor ──
  const anchorToggle = container.querySelector<HTMLButtonElement>('#wfAnchorToggle');
  const anchorForm = container.querySelector<HTMLElement>('#wfAnchorForm');
  const anchorASel = container.querySelector<HTMLSelectElement>('#wfAnchorA');
  const anchorBSel = container.querySelector<HTMLSelectElement>('#wfAnchorB');
  const anchorDistanceInput = container.querySelector<HTMLInputElement>('#wfAnchorDistance');
  const anchorApplyBtn = container.querySelector<HTMLButtonElement>('#wfAnchorApply');
  const anchorCancelBtn = container.querySelector<HTMLButtonElement>('#wfAnchorCancel');
  const anchorErrorEl = container.querySelector<HTMLElement>('#wfAnchorError');

  if (anchorBSel && objects.length > 1) anchorBSel.selectedIndex = 1;

  anchorToggle?.addEventListener('click', () => {
    if (!anchorForm) return;
    anchorForm.hidden = !anchorForm.hidden;
  });

  anchorCancelBtn?.addEventListener('click', () => {
    if (anchorForm) anchorForm.hidden = true;
    if (anchorErrorEl) anchorErrorEl.textContent = '';
  });

  anchorApplyBtn?.addEventListener('click', async () => {
    if (!anchorApplyBtn) return;
    if (anchorErrorEl) anchorErrorEl.textContent = '';

    const distanceM = Number(anchorDistanceInput?.value);
    if (!Number.isFinite(distanceM) || distanceM <= 0) {
      if (anchorErrorEl) anchorErrorEl.textContent = 'Enter a positive real-world distance in metres.';
      return;
    }

    const idxA = Number(anchorASel?.value);
    const idxB = Number(anchorBSel?.value);
    if (!Number.isInteger(idxA) || !Number.isInteger(idxB) || idxA === idxB) {
      if (anchorErrorEl) anchorErrorEl.textContent = 'Pick two different objects.';
      return;
    }
    const a = objects[idxA]?.center;
    const b = objects[idxB]?.center;
    if (!a || !b) {
      if (anchorErrorEl) anchorErrorEl.textContent = 'Selected object is missing a 3D center.';
      return;
    }

    const originalLabel = anchorApplyBtn.textContent;
    anchorApplyBtn.disabled = true;
    anchorApplyBtn.textContent = 'Applying…';
    try {
      const res = await fetch(`/api/scenes/${encodeURIComponent(scene.scan_id)}/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point_a: a, point_b: b, distance_m: distanceM }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = isApiErrorResponse(body)
          ? body.message || `Metric anchor failed: ${body.error}`
          : `Metric anchor failed (HTTP ${res.status}).`;
        if (anchorErrorEl) anchorErrorEl.textContent = msg;
        return;
      }
      setBeforeAfter({ kind: 'anchor', data: body as AnchorSceneResponse });
      if (anchorForm) anchorForm.hidden = true;
    } catch {
      if (anchorErrorEl) anchorErrorEl.textContent = 'Metric anchor failed (network error).';
    } finally {
      anchorApplyBtn.disabled = false;
      anchorApplyBtn.textContent = originalLabel;
    }
  });
}
