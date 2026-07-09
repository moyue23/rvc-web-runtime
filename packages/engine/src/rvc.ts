declare const __RVC_VERSION__: string;
declare const __ORT_VERSION__: string;

/** Configuration for {@link createRVC}. */
export interface RvcConfig {
  /**
   * Base URL where the worker script is hosted.
   *
   * Must end with `/`. The file `inference.worker.js` is expected at this
   * location.
   *
   * @defaultValue `https://cdn.jsdelivr.net/npm/rvc-web-runtime@{version}/dist/`
   */
  assetBaseUrl?: string;

  /**
   * Base URL where ONNX Runtime Web WASM files are hosted.
   *
   * Must end with `/`. onnxruntime-web loads `ort-wasm-simd-threaded.{mjs,wasm}`
   * (and the `.jsep.` variants) from this location. By default this points to
   * the official `onnxruntime-web` package on jsDelivr, which always ships a
   * complete set of WASM variants — avoiding the need to bundle/copy them.
   *
   * @defaultValue `https://cdn.jsdelivr.net/npm/onnxruntime-web@{ortVersion}/dist/`
   */
  wasmBaseUrl?: string;
}

/**
 * Lightweight context created by {@link createRVC}.
 *
 * Pass this to {@link runPipelineInWorker} and any future
 * functions that need to locate runtime assets.
 */
export interface RvcContext {
  /** Resolved base URL for the worker script (guaranteed to end with `/`). */
  readonly assetBaseUrl: string;
  /** Full URL to the inference worker script. */
  readonly workerUrl: string;
  /** Resolved base URL for ONNX Runtime WASM files (guaranteed to end with `/`). */
  readonly wasmBaseUrl: string;
}

const DEFAULT_CDN_BASE = `https://cdn.jsdelivr.net/npm/rvc-web-runtime@${__RVC_VERSION__}/dist/`;
const DEFAULT_ORT_CDN_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${__ORT_VERSION__}/dist/`;

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
  const rawAsset = config.assetBaseUrl ?? DEFAULT_CDN_BASE;
  const assetBaseUrl = rawAsset.endsWith("/") ? rawAsset : `${rawAsset}/`;
  const workerUrl = `${assetBaseUrl}inference.worker.js`;

  const rawWasm = config.wasmBaseUrl ?? DEFAULT_ORT_CDN_BASE;
  const wasmBaseUrl = rawWasm.endsWith("/") ? rawWasm : `${rawWasm}/`;

  return {
    assetBaseUrl,
    workerUrl,
    wasmBaseUrl,
  } satisfies RvcContext;
}
