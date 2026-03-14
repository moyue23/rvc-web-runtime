import type * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { SynthesisFeeds } from "./types";

export async function runInference(
  session: ort.InferenceSession,
  feeds: SynthesisFeeds,
): Promise<ort.InferenceSession.OnnxValueMapType> {
  try {
    return await session.run(feeds);
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.SYNTH_INFERENCE_FAILED,
      `ONNX inference failed during voice synthesis: ${cause instanceof Error ? cause.message : "unknown error"}`,
      cause,
    );
  }
}
