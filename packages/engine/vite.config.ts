import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { viteStaticCopy } from "vite-plugin-static-copy";
import pkg from "./package.json";

export default defineConfig({
  define: {
    __RVC_VERSION__: JSON.stringify(pkg.version),
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
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs"),
          dest: "ort-wasm",
        },
        {
          src: resolve(__dirname, "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"),
          dest: "ort-wasm",
        },
      ],
    }),
  ],
});
