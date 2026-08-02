/**
 * Open Reality — "surveyor's instrument" design tokens.
 *
 * Single source of truth for both frontends:
 *   • web  (landing/) consumes these as CSS custom properties — see `cssVars`
 *     below; landing/app/globals.css `:root` must stay in lockstep (enforced by
 *     __tests__/tokens.test.ts).
 *   • mobile (mobile/) consumes these via mobile/src/theme.ts, which maps them
 *     onto React Native StyleSheet values.
 *
 * Warm paper, ink, a single teal accent. Hairline borders, sharp corners, mono
 * data readouts, serif display type. Edit values HERE, never per-screen.
 */

/** Surface + text + accent colors. Values are CSS color strings (hex / rgba). */
export const color = {
  paper: '#e7e2d2',
  paperRaised: '#eeeadc',
  paperBright: '#f6f3e8',

  ink: '#211f1a',
  inkSoft: '#56524a',
  inkFaint: '#8b8678',
  textOnAccent: '#f6f3e8',

  /** Readable teal — text + borders. */
  accent: '#0e7c8a',
  /** Brighter teal — ticks, marks, the offset "stamp" shadow. Never long text. */
  accentBright: '#0aa5b5',

  signalOk: '#3d7a4a',
  signalWarn: '#a96f14',
  signalErr: '#a23b2a',
} as const;

/** Hairline, ink-tinted borders. */
export const border = {
  soft: 'rgba(33, 31, 26, 0.16)',
  medium: 'rgba(33, 31, 26, 0.32)',
  strong: 'rgba(33, 31, 26, 0.55)',
} as const;

/** Sharp corners. Numbers are px (and React Native points). */
export const radius = {
  base: 2,
  card: 3,
} as const;

/** Shared motion. */
export const transitionMs = 180;

/**
 * Font family identifiers. The string values are the names each platform
 * registers the family under:
 *   • web  — set on <html> by next/font in landing/app/layout.tsx
 *   • mobile — loaded via @expo-google-fonts in mobile/app/_layout.tsx
 * Mobile falls back to the platform serif/sans/mono until the file loads.
 */
export const font = {
  display: 'Newsreader',
  body: 'HankenGrotesk',
  mono: 'IBMPlexMono',
} as const;

/**
 * Type roles distilled from globals.css. `letterSpacingEm` is tracking in em;
 * web uses it directly, mobile converts to points (em × fontSize) in theme.ts.
 */
export const type = {
  /** Serif hero display. */
  displayHero: { family: font.display, size: 46, weight: '500', lineHeight: 1.0, letterSpacingEm: -0.015 },
  /** Serif section heading. */
  displaySection: { family: font.display, size: 30, weight: '500', lineHeight: 1.05, letterSpacingEm: -0.01 },
  /** Serif lead paragraph. */
  lead: { family: font.display, size: 19, weight: '400', lineHeight: 1.45, letterSpacingEm: 0 },
  /** Sans body. */
  body: { family: font.body, size: 16, weight: '400', lineHeight: 1.5, letterSpacingEm: 0 },
  /** Sans small body. */
  bodySmall: { family: font.body, size: 13, weight: '400', lineHeight: 1.5, letterSpacingEm: 0 },
  /** Mono uppercase eyebrow / kicker / field label. */
  label: { family: font.mono, size: 11, weight: '500', lineHeight: 1.2, letterSpacingEm: 0.16, uppercase: true },
  /** Mono uppercase button text. */
  button: { family: font.mono, size: 13, weight: '500', lineHeight: 1.2, letterSpacingEm: 0.09, uppercase: true },
  /** Mono data readout (HUD / stats), tabular. */
  readout: { family: font.mono, size: 11, weight: '400', lineHeight: 1.3, letterSpacingEm: 0.05 },
} as const;

/**
 * Dark immersive surfaces — used where the UI sits over a live camera feed or a
 * 3D point cloud (mobile capture + viewer), and a paper background would wash
 * out. Warm near-black in the ink family, paper-tinted text + hairlines, teal
 * accent for actions. The web app has no dark viewer today, so these are NOT
 * part of `cssVars` (the web `:root` parity set); they're a shared extension
 * ready to adopt if the web viewer ever goes dark.
 */
export const dark = {
  /** Immersive page background. */
  surface: '#1b1812',
  /** Panel / HUD over the camera or cloud. */
  scrim: 'rgba(33, 31, 26, 0.86)',
  scrimSoft: 'rgba(33, 31, 26, 0.7)',
  /** Hairline border on a dark surface (paper-tinted). */
  border: 'rgba(246, 243, 232, 0.18)',
  text: color.paperBright,
  textSoft: '#cfc9b8',
  textFaint: color.inkFaint,
  /** Signal tints lifted for legibility on near-black (the light-theme signals are too dark here). */
  signalOk: '#7bb98a',
  signalWarn: '#d8a43a',
  signalErr: '#e29182',
} as const;

/**
 * The exact `:root` custom-property set the web app declares. Keys are the CSS
 * variable names (without the leading `--`). landing/app/globals.css must match
 * this map verbatim — __tests__/tokens.test.ts fails the build on drift.
 */
export const cssVars: Readonly<Record<string, string>> = {
  paper: color.paper,
  'paper-raised': color.paperRaised,
  'paper-bright': color.paperBright,
  ink: color.ink,
  'ink-soft': color.inkSoft,
  'ink-faint': color.inkFaint,
  'text-on-accent': color.textOnAccent,
  accent: color.accent,
  'accent-bright': color.accentBright,
  'signal-ok': color.signalOk,
  'signal-warn': color.signalWarn,
  'signal-err': color.signalErr,
  'border-soft': border.soft,
  'border-medium': border.medium,
  'border-strong': border.strong,
  radius: `${radius.base}px`,
  'radius-card': `${radius.card}px`,
  transition: `all ${transitionMs / 1000}s ease`,
};

/** Render `cssVars` as a `:root { … }` block (handy for codegen / parity checks). */
export function toCssRoot(): string {
  const body = Object.entries(cssVars)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n');
  return `:root {\n${body}\n}`;
}
