import type { WorkerResponseMessage } from "./types";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import type { RuntimeContext } from "../types/runtime/runtime";
import { RvcError } from "../errors/RvcError";

export interface WorkerClientOptions {
  timeout?: number;
}

/**
 * Runs the RVC pipeline in a Web Worker.
 */
export async function runPipelineInWorker(
  files: Omit<PipelineFiles, "audio">,
  audioData: Float32Array,
  audioSampleRate: number,
  callbacks: PipelineCallbacks = {},
  options: WorkerClientOptions = {},
): Promise<RuntimeContext> {
  const { timeout = 300000 } = options;
  const [modelBuf, contentVecBuf, rmvpeBuf, indexBuf] = await Promise.all([
    files.model.arrayBuffer(),
    files.contentVec.arrayBuffer(),
    files.rmvpe.arrayBuffer(),
    files.index?.arrayBuffer(),
  ]);

  return new Promise((resolve, reject) => {
    // Create worker using Vite's Worker constructor pattern
    const worker = new Worker(new URL("./inference.worker.ts", import.meta.url), {
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
    });
  });
}

/**
 * Check if Web Workers are supported in the current environment.
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== "undefined";
}
