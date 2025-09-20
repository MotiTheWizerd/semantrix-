import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      semantrix: path.resolve(__dirname, "src/index.ts"),
      "semantrix/runtime": path.resolve(__dirname, "src/runtime")
    }
  }
});
