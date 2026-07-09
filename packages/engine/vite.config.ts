import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync } from "node:fs";
import dts from "vite-plugin-dts";
import pkg from "./package.json";

// onnxruntime-web's `exports` map restricts `./package.json`, so resolve the
// file directly from the filesystem instead of via `require.resolve`.
const ortDir = resolve(__dirname, "../../node_modules/onnxruntime-web");
const ortVersion = JSON.parse(
  readFileSync(resolve(ortDir, "package.json"), "utf-8"),
).version;

export default defineConfig({
  define: {
    __RVC_VERSION__: JSON.stringify(pkg.version),
    // Inject the onnxruntime-web version so the default WASM CDN URL stays
    // in sync with the ort version actually bundled into the worker.
    __ORT_VERSION__: JSON.stringify(ortVersion),
  },

  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },

  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },

  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RvcWebRuntime",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["onnxruntime-web", "rvc-onnx-web"],
      output: {
        globals: {
          "onnxruntime-web": "ort",
        },
      },
    },
    sourcemap: true,
    minify: false,
    outDir: "dist",
  },

  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src"],
      outDir: "dist",
    }),
    // WASM files are NOT copied into this package. They are loaded directly
    // from the official onnxruntime-web CDN (see `wasmBaseUrl` in rvc.ts),
    // which always ships a complete set of WASM variants (jsep/asyncify/...).
  ],
});
