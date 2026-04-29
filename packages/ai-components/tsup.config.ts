import { defineConfig } from "tsup";

export default defineConfig([
  // Main bundle: ESM + CJS (for npm import)
  {
    entry: { "ai-components": "src/index.ts" },
    format: ["esm", "cjs"],
    dts: { entry: "src/index.ts" },
    sourcemap: true,
    clean: true,
    target: "es2020",
    minify: false,
  },
  // IIFE bundle: for <script> tag injection (drop into any page)
  {
    entry: { "ai-components.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "AIC",
    sourcemap: true,
    target: "es2020",
    minify: true,
  },
]);
