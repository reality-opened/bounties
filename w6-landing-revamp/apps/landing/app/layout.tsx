import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import "./globals.css";
import "driver.js/dist/driver.css";
import "./onboarding/driver-theme.css";
import HelpButtonMount from "./onboarding/HelpButtonMount";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ClerkThemeProvider } from "@/app/components/ClerkThemeProvider";

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
  title: "Open Reality",
  description: "Real-time spatial intelligence from a phone camera.",
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
        {/* Blocking theme-init script — runs synchronously before any paint so
            there is no FOUC. Reads localStorage first, then system preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('or-theme');if(s==='dark'||s==='light'){document.documentElement.dataset.theme=s;return;}if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}else{document.documentElement.dataset.theme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ClerkThemeProvider>
          <div className="shell">
            <header className="nav">
              <Link href="/" className="brand" aria-label="Open Reality home">
                <span className="brand-mark" aria-hidden="true" />
                <span>Open Reality</span>
              </Link>
              <nav className="nav-actions" aria-label="Account">
                <ThemeToggle />
                {/* Modal compute credit — small text mark in the right nav chip.
                    "Compute" is the mono micro-label; .modal-credit-tick renders
                    the real Modal "M" mark from /modal-logo.svg (CSS background,
                    not <img>); "Modal" is the wordmark. Hides on narrow
                    viewports (≤820 px). Logo asset: public/modal-logo.svg. */}
                <span className="modal-credit">
                  <span className="modal-credit-label">Compute</span>
                  <span className="modal-credit-tick" aria-hidden="true" />
                  <span className="modal-credit-name">Modal</span>
                </span>
                <span className="modal-credit-rule" aria-hidden="true" />
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="button button-secondary" type="button">
                      Sign in
                    </button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    className="button button-secondary"
                    href="/dashboard"
                    prefetch={false}
                  >
                    Dashboard
                  </Link>
                  <UserButton />
                </Show>
              </nav>
            </header>
            <main>{children}</main>
            <HelpButtonMount />
          </div>
        </ClerkThemeProvider>
      </body>
    </html>
  );
}
