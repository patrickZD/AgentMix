import { defineConfig } from "vitest/config";
import path from "path";

// Store/logic tests run in a plain node environment (no DOM needed). The `@`
// alias mirrors vite.config.ts so store imports resolve the same way.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
