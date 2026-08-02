import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    // Kit-relative: original is "app/**/*.test.{ts,tsx}"; this scaffold's
    // components live under src/ instead of app/.
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/components/**/*.{ts,tsx}"],
      exclude: ["src/components/**/*.test.{ts,tsx}", "src/components/proofData.ts"],
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
