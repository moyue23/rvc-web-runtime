import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

export default defineConfig({
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
        // Copy docs from root directory
        {
          src: resolve(__dirname, "../../docs/*.md"),
          dest: "docs",
        },
      ],
    }),
  ],
});
