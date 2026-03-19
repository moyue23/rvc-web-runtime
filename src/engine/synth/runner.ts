import type * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { SynthesisFeeds } from "./types";

export async function runInference(
  session: ort.InferenceSession,
  feeds: SynthesisFeeds,
): Promise<ort.InferenceSession.OnnxValueMapType> {
  try {
    // Filter feeds to only include inputs the model expects
    const filteredFeeds: Record<string, ort.Tensor> = {};
    for (const name of session.inputNames) {
      if (name in feeds) {
        filteredFeeds[name] = feeds[name];
      }
    }

    return await session.run(filteredFeeds);
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.SYNTH_INFERENCE_FAILED,
      `ONNX inference failed during voice synthesis: ${cause instanceof Error ? cause.message : "unknown error"}`,
      cause,
    );
  }
}
