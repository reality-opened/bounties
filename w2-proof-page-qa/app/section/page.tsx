import type { Metadata } from "next";
import BenchmarkProof from "../components/landing/BenchmarkProof";

export const metadata: Metadata = {
  title: "Benchmark section — QA",
  description: "BenchmarkProof landing section, rendered standalone for QA.",
};

export default function SectionPage() {
  return <BenchmarkProof />;
}
