import type { EngineState, RuntimeContext } from "../types/runtime/runtime";
import type { ErrorCode } from "../errors/errorCodes";

/**
 * Messages sent from main thread to Worker.
 */
export type WorkerRequestMessage =
  | {
      type: "RUN_PIPELINE";
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
    }
  | { type: "CANCEL" };

/**
 * Messages sent from Worker to main thread.
 */
export type WorkerResponseMessage =
  | { type: "PROGRESS"; state: EngineState; progress: number }
  | { type: "COMPLETE"; result: RuntimeContext }
  | { type: "ERROR"; code: ErrorCode; error: string }
  | { type: "LOG"; level: "log" | "error" | "warn"; message: string };
