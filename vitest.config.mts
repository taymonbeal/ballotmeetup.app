import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Integration tests talk to a real (local) Supabase instance over the
    // network, so the default 5s timeout is too tight.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
