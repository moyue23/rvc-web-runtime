import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
      ],
    }),
  ],
});
