import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    clearMocks: true,
  },
  resolve: {
    // Mirrors tsconfig's "@/*" -> "./*" so tests can import modules (e.g. listings.service.ts,
    // providers/index.ts) that use the "@/" alias for real (non-type) imports.
    alias: {
      "@": dirname,
    },
  },
});
