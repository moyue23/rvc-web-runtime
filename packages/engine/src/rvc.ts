import * as ort from "onnxruntime-web";

declare const __RVC_VERSION__: string;

/** Configuration for {@link createRVC}. */
export interface RvcConfig {
  /**
   * Base URL where runtime assets (worker script, WASM files) are hosted.
   *
   * Must end with `/`. The following files are expected at this location:
   * - `inference.worker.js` — the Web Worker entry
   * - `ort-wasm/ort-wasm-simd-threaded.wasm`
   * - `ort-wasm/ort-wasm-simd-threaded.mjs`
   *
   * @defaultValue `https://cdn.jsdelivr.net/npm/rvc-web-runtime@{version}/dist/`
   */
  assetBaseUrl?: string;
}

/**
 * Lightweight context created by {@link createRVC}.
 *
 * Pass this to {@link runPipelineInWorker} and any future
 * functions that need to locate runtime assets.
 */
export interface RvcContext {
  /** Resolved base URL for runtime assets (guaranteed to end with `/`). */
  readonly assetBaseUrl: string;
  /** Full URL to the inference worker script. */
  readonly workerUrl: string;
}

const DEFAULT_CDN_BASE = `https://cdn.jsdelivr.net/npm/rvc-web-runtime@${__RVC_VERSION__}/dist/`;

/**
 * Create an RVC runtime context.
 *
 * Zero-config usage (uses jsDelivr CDN by default):
 * ```ts
 * const rvc = createRVC();
 * await runPipelineInWorker(rvc, files, audio, sampleRate);
 * ```
 *
 * Custom CDN / self-hosted assets:
 * ```ts
 * const rvc = createRVC({ assetBaseUrl: "https://my-cdn.com/rvc/" });
 * ```
 */
export function createRVC(config: RvcConfig = {}): RvcContext {
  const raw = config.assetBaseUrl ?? DEFAULT_CDN_BASE;
  const assetBaseUrl = raw.endsWith("/") ? raw : `${raw}/`;

  // Let ONNX Runtime know where to load WASM files from
  ort.env.wasm.wasmPaths = assetBaseUrl;

  const workerUrl = new URL("inference.worker.js", assetBaseUrl).href;

  return {
    assetBaseUrl,
    workerUrl,
  } satisfies RvcContext;
}
