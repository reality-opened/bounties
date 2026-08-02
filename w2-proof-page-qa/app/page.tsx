import Link from "next/link";

/* Kit index — not part of the real site. Just points at the two QA surfaces. */
export default function Home() {
  return (
    <main style={{ padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1>Bounty W2 — Benchmark-proof page QA</h1>
      <p>This scaffold contains exactly two routes to audit:</p>
      <ul>
        <li>
          <Link href="/proof">/proof</Link> — the full benchmark-proof page.
        </li>
        <li>
          <Link href="/section">/section</Link> — the BenchmarkProof landing
          section, rendered standalone.
        </li>
      </ul>
    </main>
  );
}
