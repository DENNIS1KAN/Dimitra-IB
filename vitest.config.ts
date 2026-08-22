import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "lib/testing/server-only-stub.ts"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "db/**/*.test.ts"],
    environment: "node",
  },
});
