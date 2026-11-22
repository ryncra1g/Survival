import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      "@": import.meta.dirname,
      // Route handlers can be unit-tested (tests/authz.test.ts); "server-only" only guards client bundles.
      "server-only": `${import.meta.dirname}/tests/stubs/server-only.ts`,
    },
  },
});
