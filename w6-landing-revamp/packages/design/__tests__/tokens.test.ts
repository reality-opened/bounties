import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { cssVars, toCssRoot } from '../tokens';

const here = dirname(fileURLToPath(import.meta.url));
const globalsCssPath = resolve(here, '../../../apps/landing/app/globals.css');

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

describe('design tokens ↔ landing globals.css parity', () => {
  const rootVars = readRootVars();

  it.each(Object.entries(cssVars))(
    'landing declares --%s with the shared token value',
    (name, value) => {
      expect(rootVars[name], `--${name} missing from landing/app/globals.css :root`).toBeDefined();
      expect(rootVars[name]).toBe(normalize(value));
    },
  );

  it('exposes the canonical :root block for codegen', () => {
    expect(toCssRoot()).toContain('--accent: #0e7c8a;');
  });
});
