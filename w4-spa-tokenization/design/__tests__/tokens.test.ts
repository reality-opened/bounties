import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { cssVars, toCssRoot } from '../tokens';

const here = dirname(fileURLToPath(import.meta.url));

// NOTE (bounty kit adaptation): the real packages/design/__tests__/tokens.test.ts reads
// `../../apps/landing/app/globals.css` — the live Next.js landing app's stylesheet — to check
// that it hasn't drifted from these tokens. That app isn't part of this kit (only the tokens
// package itself was in scope), so this test instead reads a FIXTURE-IZED copy of just its
// `:root { ... }` block, captured at kit assembly time: ./fixtures/landing-globals-root.css.
// Everything else about the test (the parity assertions) is unchanged.
const globalsCssPath = resolve(here, './fixtures/landing-globals-root.css');

/** Pull the first `:root { … }` declaration block out of the stylesheet. */
function readRootVars(): Record<string, string> {
  const css = readFileSync(globalsCssPath, 'utf8');
  const block = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!block) throw new Error(`no :root block found in ${globalsCssPath}`);
  const vars: Record<string, string> = {};
  for (const decl of block[1].split(';')) {
    const m = decl.match(/--([\w-]+)\s*:\s*([^;]+)/);
    if (m) vars[m[1]] = normalize(m[2]);
  }
  return vars;
}

/** Collapse internal whitespace + drop trailing CSS comments so `rgba(…)` etc. compare cleanly. */
function normalize(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();
}

describe('design tokens ↔ landing globals.css fixture parity', () => {
  const rootVars = readRootVars();

  it.each(Object.entries(cssVars))(
    'the fixture declares --%s with the shared token value',
    (name, value) => {
      expect(rootVars[name], `--${name} missing from the landing globals.css :root fixture`).toBeDefined();
      expect(rootVars[name]).toBe(normalize(value));
    },
  );

  it('exposes the canonical :root block for codegen', () => {
    expect(toCssRoot()).toContain('--accent: #0e7c8a;');
  });
});
