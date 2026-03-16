import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/**
 * Run ContentVec inference and return formatted features.
 */
export async function runContentVecInference(
  session: ort.InferenceSession,
  audio: Float32Array,
): Promise<{ hiddenStates: Float32Array; frameCount: number; featureSize: number }> {
  try {
    const feeds = {
      source: new ort.Tensor("float32", audio, [1, audio.length]),
      padding_mask: new ort.Tensor("bool", new Uint8Array(audio.length).fill(0), [1, audio.length]),
      output_layer: new ort.Tensor("int64", new BigInt64Array([12n]), [1]),
    };

    const results = await session.run(feeds);
    const output = results[session.outputNames[0] ?? "hidden_states"] as ort.Tensor;
    const [, frameCount, featureSize] = output.dims;

    return {
      hiddenStates: output.data as Float32Array,
      frameCount,
      featureSize,
    };
  } catch (cause) {
    throw new RvcError(ErrorCodes.FEATURE_INFERENCE_FAILED, "ContentVec inference failed.", cause);
  }
}
