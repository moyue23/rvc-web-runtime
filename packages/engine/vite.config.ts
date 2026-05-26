import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
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
      // 确保外部化那些你不想打包进库的依赖
      external: ["onnxruntime-web"],
      output: {
        // 为外部化的依赖提供全局变量
        globals: {
          "onnxruntime-web": "ort",
        },
      },
    },
    sourcemap: true,
    minify: false, // 库构建通常不压缩，让使用者自己压缩
    outDir: "dist",
  },

  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src"],
      outDir: "dist",
    }),
  ],
});
