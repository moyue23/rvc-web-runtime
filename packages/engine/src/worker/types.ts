import type { PipelineEvent, PipelineOptions } from "../types/contracts/pipeline";
import type { RuntimeContext } from "../types/runtime/runtime";
import type { ErrorCode } from "../errors/errorCodes";

/**
 * Messages sent from main thread to Worker.
 */
export type WorkerRequestMessage =
  | {
      type: "RUN_PIPELINE";
      assetBaseUrl: string;
      audio: {
        data: Float32Array;
        sampleRate: number;
      };
      files: {
        model: ArrayBuffer;
        contentVec: ArrayBuffer;
        rmvpe: ArrayBuffer;
        index?: ArrayBuffer;
      };
      fileNames: {
        model: string;
        contentVec: string;
        rmvpe: string;
        index?: string;
      };
      options: PipelineOptions;
    }
  | { type: "CANCEL" };

/**
 * Messages sent from Worker to main thread.
 */
export type WorkerResponseMessage =
  | { type: "EVENT"; event: PipelineEvent }
  | { type: "COMPLETE"; result: RuntimeContext }
  | { type: "ERROR"; code: ErrorCode; error: string }
  | { type: "LOG"; level: "log" | "error" | "warn"; message: string };
