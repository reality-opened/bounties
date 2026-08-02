#!/usr/bin/env node
/**
 * check-no-raw-colors.mjs
 *
 * Fails (exit 1) if any raw color literal (hex, or an rgb()/rgba() call with literal numeric
 * arguments) is found in the given CSS file(s), OUTSIDE of a `:root { ... }` custom-property
 * declaration block. The intent: component/page CSS should reference design tokens via
 * `var(--token-name)`, never hard-code a color — the one place raw values are expected to live is
 * the token declaration itself (a `:root` block generated from `@reality/design`'s
 * `toCssRoot()`/`cssVars`, or — in this kit's STARTING state — the legacy hand-copied `:root` in
 * src/styles/refine.css that the bounty task replaces).
 *
 * Usage:
 *   node scripts/check-no-raw-colors.mjs [file ...]   # defaults to src/styles/refine.css
 *
 * This is intentionally simple (regex-based, no CSS parser dependency) — good enough to catch
 * "this button still has a hard-coded hex" without pulling in a package we'd need `npm install`
 * to use. Extend it if your tokenization work needs a smarter check (e.g. once refine.css's
 * `:root` block is gone entirely, you may want to make ANY hex/rgb literal in this file an error,
 * with no `:root` carve-out at all).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ['src/styles/refine.css'];

// Matches valid CSS hex color lengths: #rgb, #rgba, #rrggbb, #rrggbbaa.
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
// Matches rgb(/rgba( immediately followed by a literal digit (not `var(--...)`).
const RGB_FN_RE = /\brgba?\(\s*\d/g;

/** Strip /* ... *\/ comments so documentation-comment colors (e.g. this file's own header) don't
 *  get flagged. Replaces comment bodies with spaces so line/column counts stay accurate. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Byte offset -> 1-based {line, column}. */
function locate(text, index) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: index - lastNewline };
}

/** Byte ranges covered by top-level `:root { ... }` blocks (the one place raw literals are
 *  expected — see file header). Doesn't handle nested braces inside :root (this codebase's
 *  :root blocks never nest), which is fine for this simple check. */
function rootBlockRanges(css) {
  const ranges = [];
  const re = /:root(?:\[[^\]]*\])?\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    const start = m.index;
    const braceOpen = css.indexOf('{', start);
    const braceClose = css.indexOf('}', braceOpen);
    if (braceClose === -1) continue;
    ranges.push([start, braceClose]);
  }
  return ranges;
}

function inAnyRange(index, ranges) {
  return ranges.some(([s, e]) => index >= s && index <= e);
}

let totalHits = 0;

for (const target of targets) {
  const path = resolve(process.cwd(), target);
  const raw = readFileSync(path, 'utf8');
  const css = stripComments(raw);
  const roots = rootBlockRanges(css);

  const hits = [];
  for (const re of [HEX_RE, RGB_FN_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(css))) {
      if (inAnyRange(m.index, roots)) continue; // allowed inside :root token declarations
      const { line, column } = locate(css, m.index);
      hits.push({ line, column, match: m[0] });
    }
  }
  hits.sort((a, b) => a.line - b.line || a.column - b.column);

  if (hits.length === 0) {
    console.log(`OK   ${target}: no raw color literals outside :root`);
    continue;
  }

  console.log(`FAIL ${target}: ${hits.length} raw color literal(s) outside :root`);
  for (const h of hits) {
    console.log(`  ${target}:${h.line}:${h.column}  ${h.match}`);
  }
  totalHits += hits.length;
}

if (totalHits > 0) {
  console.error(`\n${totalHits} raw color literal(s) found. Replace with var(--token-name) from @reality/design.`);
  process.exit(1);
}

console.log('\nClean — no raw color literals outside :root.');
