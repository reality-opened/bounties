import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Minimal root layout for the bounty kit — no nav, no auth, no Clerk. Kept to
 * exactly what the /proof and /section pages need to render with the correct
 * type + color tokens: the three landing fonts (next/font/google, same as
 * apps/landing/app/layout.tsx) and globals.css.
 *
 * NOTE (kit-only addition, not part of the proof/BenchmarkProof import graph):
 * the inline script below is copied from the real layout's FOUC-prevention
 * theme-init. Without it, :root never gets a `data-theme` attribute, and the
 * dark token set in globals.css (`:root[data-theme="dark"] { ... }`) can never
 * activate — which would make the "dark/light plate handling" QA item
 * impossible to test. It reads localStorage first, then falls back to the OS
 * `prefers-color-scheme`. To preview dark mode: toggle your OS/browser dark
 * mode, or run `document.documentElement.dataset.theme = "dark"` in devtools. */

const displaySerif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});

const bodySans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Bounty W2 — Benchmark-proof page QA",
  description: "Standalone QA scaffold: /proof page + BenchmarkProof section only.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${bodySans.variable} ${monoFont.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('or-theme');if(s==='dark'||s==='light'){document.documentElement.dataset.theme=s;return;}if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}else{document.documentElement.dataset.theme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
