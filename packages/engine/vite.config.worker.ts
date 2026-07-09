import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Separate build config for the inference worker.
 *
 * The worker MUST be self-contained so it can be deployed to a CDN.
 * `onnxruntime-web` (~474 KB) and `rvc-onnx-web` (~70 KB) are bundled in;
 * runtime .wasm files are loaded from the onnxruntime-web CDN via
 * `wasmBaseUrl` passed in the RUN_PIPELINE message (see inference.worker.ts).
 */
export default defineConfig({
  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/worker/inference.worker.ts"),
      formats: ["es"],
      fileName: "inference.worker",
    },
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      external: [], // bundle all JS deps — worker must be CDN-self-contained
    },
    sourcemap: true,
    minify: false,
  },
});
