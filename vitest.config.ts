import { defineConfig } from "vitest/config";

/**
 * Unit tests for the plain logic in src/lib — the money math, stock rules and
 * wording every screen shares. No database or browser: these run in a second so
 * they can run before every build.
 */
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    include: ["src/**/*.test.ts", "db/**/*.test.ts"],
    environment: "node",
    // The cross-business test talks to a real database and shares one connection.
    fileParallelism: false,
  },
});
