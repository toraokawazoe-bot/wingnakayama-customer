import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    // テストは in-memory libsql を使用（src/db が import 時に env を読むため、ここで指定する）
    env: {
      TURSO_DATABASE_URL: ":memory:",
      TURSO_AUTH_TOKEN: "",
    },
    include: ["tests/**/*.test.ts"],
  },
});
