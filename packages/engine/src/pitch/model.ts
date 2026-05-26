import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/**
 * Load RMVPE ONNX model from File.
 */
export async function loadRmvpeModel(source: File): Promise<ort.InferenceSession> {
  const arrayBuffer = await source.arrayBuffer();
  return createSession(arrayBuffer);
}

async function createSession(arrayBuffer: ArrayBuffer): Promise<ort.InferenceSession> {
  try {
    return await ort.InferenceSession.create(arrayBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.PITCH_MODEL_LOAD_FAILED,
      "Failed to create RMVPE ONNX session.",
      cause,
    );
  }
}
