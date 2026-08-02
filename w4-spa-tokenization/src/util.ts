/**
 * Copied verbatim from apps/webserver/src/sceneReportView.ts (`escapeHtml`) — a tiny, dependency-
 * free helper, not worth its own package. Everything else in that file (renderSceneReport,
 * metricChip) belongs to the summary/report page, which is out of scope for this kit.
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
