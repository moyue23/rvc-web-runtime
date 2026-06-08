import type { WorkerRequestMessage, WorkerResponseMessage } from "./types";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import type { RuntimeContext } from "../types/runtime/runtime";
import { runPipeline } from "../pipeline/runPipeline";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes, type ErrorCode } from "../errors/errorCodes";
import * as ort from "onnxruntime-web";

// Derive WASM path from the worker's own URL.
// This ensures ort finds its .wasm files as long as they are deployed
// to the same directory as the worker script (which is the convention
// with `createRVC({ assetBaseUrl })`).
ort.env.wasm.wasmPaths = new URL(".", self.location.href).href;

/**
 * Worker entry point for running the RVC pipeline off the main thread.
 * Audio decoding happens on the main thread and the decoded PCM is passed in.
 */
const post = (message: WorkerResponseMessage) => {
  self.postMessage(message);
};

const consoleProxy = {
  log: (...args: unknown[]) => {
    post({ type: "LOG", level: "log", message: args.join(" ") });
  },
  error: (...args: unknown[]) => {
    post({ type: "LOG", level: "error", message: args.join(" ") });
  },
  warn: (...args: unknown[]) => {
    post({ type: "LOG", level: "warn", message: args.join(" ") });
  },
};

self.onmessage = async (event: MessageEvent<WorkerRequestMessage>) => {
  const { type } = event.data;

  if (type === "CANCEL") {
    // TODO: Implement cancellation token
    return;
  }

  if (type !== "RUN_PIPELINE") {
    post({
      type: "ERROR",
      code: ErrorCodes.WORKER_UNKNOWN_ERROR,
      error: `Unknown message type: ${type}`,
    });
    return;
  }

  const { audio, files, fileNames, options } = event.data;

  try {
    // Reconstruct File objects for models (audio already decoded on main thread)
    const modelFile = new File([files.model], fileNames.model);
    const contentVecFile = new File([files.contentVec], fileNames.contentVec);
    const rmvpeFile = new File([files.rmvpe], fileNames.rmvpe);

    const pipelineFiles: PipelineFiles = {
      model: modelFile,
      audio: new File([], "audio.wav"),
      contentVec: contentVecFile,
      rmvpe: rmvpeFile,
    };

    if (files.index) {
      pipelineFiles.index = new File([files.index], fileNames.index ?? "index");
    }

    consoleProxy.log("[Worker] Starting pipeline...");

    const callbacks: PipelineCallbacks = {
      onEvent: (event) => {
        post({ type: "EVENT", event });
      },
    };

    // Pass pre-decoded audio to pipeline (AudioContext not available in worker)
    const result: RuntimeContext = await runPipeline(pipelineFiles, callbacks, options, {
      data: audio.data,
      sampleRate: audio.sampleRate,
    });

    // Extract serializable data for the response
    // Note: Some fields like modelSession cannot be transferred
    // Check for pipeline failure (runPipeline catches internally and returns failed ctx)
    if (result.state === "failed") {
      const errorCode = (result.errorCode as ErrorCode) ?? ErrorCodes.WORKER_UNKNOWN_ERROR;
      const errorMessage = result.errorMessage ?? "Pipeline failed";
      consoleProxy.error("[Worker] Pipeline failed:", `[${errorCode}]`, errorMessage);
      post({ type: "ERROR", code: errorCode, error: errorMessage });
      return;
    }

    // Extract serializable data for the response
    // Note: Some fields like modelSession cannot be transferred
    const serializableResult: RuntimeContext = {
      ...result,
      // Clear non-serializable session object
      modelSession: undefined,
    };

    consoleProxy.log("[Worker] Pipeline complete!");
    post({ type: "COMPLETE", result: serializableResult });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown worker error";
    const errorCode: ErrorCode =
      error instanceof RvcError ? error.code : ErrorCodes.WORKER_UNKNOWN_ERROR;
    consoleProxy.error("[Worker] Pipeline failed:", `[${errorCode}]`, errorMessage);
    post({ type: "ERROR", code: errorCode, error: errorMessage });
  }
};

// Notify main thread that worker is ready
post({ type: "LOG", level: "log", message: "[Worker] Ready" });
