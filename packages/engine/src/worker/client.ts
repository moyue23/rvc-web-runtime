import type { WorkerResponseMessage } from "./types";
import type {
  PipelineFiles,
  PipelineCallbacks,
  PipelineOptions,
} from "../types/contracts/pipeline";
import type { RuntimeContext } from "../types/runtime/runtime";
import type { RvcContext } from "../rvc";
import { RvcError } from "../errors/RvcError";

export interface WorkerClientOptions extends PipelineOptions {
  timeout?: number;
}

/**
 * Fetch the worker script from a (possibly cross-origin) URL and create
 * a same-origin Blob URL so `new Worker(url, { type: "module" })` works
 * regardless of where the script is hosted (CDN, custom domain, etc.).
 */
async function createWorkerUrl(workerScriptUrl: string): Promise<string> {
  const response = await fetch(workerScriptUrl);
  if (!response.ok) {
    throw new RvcError(
      "WORKER_FETCH_FAILED",
      `Failed to fetch worker script from ${workerScriptUrl}: ${response.status}`,
    );
  }
  const code = await response.text();
  const blob = new Blob([code], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

/**
 * Runs the RVC pipeline in a Web Worker.
 *
 * The worker script is fetched from {@link RvcContext.workerUrl}, then
 * loaded via a same-origin Blob URL to avoid cross-origin restrictions
 * on module workers.
 */
export async function runPipelineInWorker(
  ctx: RvcContext,
  files: Omit<PipelineFiles, "audio">,
  audioData: Float32Array,
  audioSampleRate: number,
  callbacks: PipelineCallbacks = {},
  options: WorkerClientOptions = {},
): Promise<RuntimeContext> {
  const { timeout = 300000, ...pipelineOptions } = options;
  const [modelBuf, contentVecBuf, rmvpeBuf, indexBuf, workerUrl] = await Promise.all([
    files.model.arrayBuffer(),
    files.contentVec.arrayBuffer(),
    files.rmvpe.arrayBuffer(),
    files.index?.arrayBuffer(),
    createWorkerUrl(ctx.workerUrl),
  ]);

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, {
      type: "module",
    });

    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new RvcError("WORKER_TIMEOUT", `Pipeline timed out after ${timeout}ms`));
    }, timeout);

    worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
      const { type } = event.data;

      switch (type) {
        case "EVENT": {
          callbacks.onEvent?.(event.data.event);
          break;
        }

        case "COMPLETE": {
          clearTimeout(timeoutId);
          worker.terminate();
          resolve(event.data.result);
          break;
        }

        case "ERROR": {
          clearTimeout(timeoutId);
          worker.terminate();
          const { code, error } = event.data;
          reject(new RvcError(code, error));
          break;
        }

        case "LOG": {
          const { level, message } = event.data;
          console[level](message);
          break;
        }
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(error);
    };

    worker.postMessage({
      type: "RUN_PIPELINE",
      assetBaseUrl: ctx.assetBaseUrl,
      audio: {
        data: audioData,
        sampleRate: audioSampleRate,
      },
      files: {
        model: modelBuf,
        contentVec: contentVecBuf,
        rmvpe: rmvpeBuf,
        index: indexBuf,
      },
      fileNames: {
        model: files.model.name,
        contentVec: files.contentVec.name,
        rmvpe: files.rmvpe.name,
        index: files.index?.name,
      },
      options: pipelineOptions,
    });
  });
}

/**
 * Check if Web Workers are supported in the current environment.
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== "undefined";
}
