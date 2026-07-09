import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";
import { readFileSync } from "node:fs";
import enginePkg from "../engine/package.json";

const ortDir = resolve(__dirname, "../../node_modules/onnxruntime-web");
const ortVersion = JSON.parse(
  readFileSync(resolve(ortDir, "package.json"), "utf-8"),
).version;

export default defineConfig({
  define: {
    __RVC_VERSION__: JSON.stringify(enginePkg.version),
    __ORT_VERSION__: JSON.stringify(ortVersion),
  },

  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },

  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },

  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },

  publicDir: "public",

  plugins: [
    viteStaticCopy({
      targets: [
        // Copy ONNX Runtime WASM files for the browser runtime
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.mjs",
          dest: "onnx-wasm",
        },
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.wasm",
          dest: "onnx-wasm",
        },
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.jsep.mjs",
          dest: "onnx-wasm",
        },
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.jsep.wasm",
          dest: "onnx-wasm",
        },
        // Copy engine worker from the engine package (needs npm run build:engine first)
        {
          src: resolve(__dirname, "../engine/dist/inference.worker.js"),
          dest: ".",
        },
        // Copy docs from root directory
        {
          src: resolve(__dirname, "../../docs/*.md"),
          dest: "docs",
        },
      ],
    }),
  ],
});
