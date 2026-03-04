import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ortStaticRoot = path.resolve(__dirname, "static", "onnx-wasm");

export default defineConfig({
  publicDir: "static",
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
    {
      name: "serve-ort-static-modules",
      apply: "serve",
      enforce: "pre",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url) return next();
          const urlPath = req.url.split("?")[0];
          if (!urlPath.startsWith("/onnx-wasm/")) return next();

          const isMjs = urlPath.endsWith(".mjs");
          const isWasm = urlPath.endsWith(".wasm");
          if (!isMjs && !isWasm) return next();

          const relPath = urlPath.slice("/onnx-wasm/".length);
          const filePath = path.join(ortStaticRoot, relPath);
          if (!filePath.startsWith(ortStaticRoot + path.sep)) return next();
          if (!fs.existsSync(filePath)) return next();

          res.statusCode = 200;
          res.setHeader("Content-Type", isMjs ? "application/javascript" : "application/wasm");
          res.setHeader("Cache-Control", "no-cache");
          res.end(fs.readFileSync(filePath));
        });
      },
    },
  ],
});
