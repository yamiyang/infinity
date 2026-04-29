import { defineConfig } from "tsup";

export default defineConfig([
  // Main bundle: ESM + CJS (for npm import)
  {
    entry: { "wc-components": "src/index.ts" },
    format: ["esm", "cjs"],
    dts: { entry: "src/index.ts" },
    sourcemap: true,
    clean: true,
    target: "es2020",
    minify: false,
  },
  // IIFE bundle: for <script> tag injection (drop into any page)
  {
    entry: { "wc-components.iife": "src/index.ts" },
    format: ["iife"],
    globalName: "WC",
    sourcemap: true,
    target: "es2020",
    minify: true,
  },
  // Inject helper: returns all component scripts as a string (for iframe injection)
  {
    entry: { inject: "src/inject.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    target: "es2020",
  },
]);
