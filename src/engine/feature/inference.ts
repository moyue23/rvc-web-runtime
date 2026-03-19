import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/**
 * Run ContentVec inference and return formatted features.
 * Compatible with MoeSS ContentVec ONNX models (single input/output).
 * Applies 2x linear upsampling to match RVC official pipeline.
 */
export async function runContentVecInference(
  session: ort.InferenceSession,
  audio: Float32Array,
): Promise<{
  hiddenStates: Float32Array;
  frameCount: number;
  upsampledFrameCount: number;
  featureSize: number;
}> {
  try {
    const inputNames = session.inputNames;
    const outputNames = session.outputNames;

    // Build feeds based on model's expected inputs
    const feeds: Record<string, ort.Tensor> = {};

    // Temporary: limit audio length to prevent OOM
    // TODO: implement proper chunking for long audio
    const MAX_SAMPLES = 16000 * 30; // 30 seconds at 16kHz
    if (audio.length > MAX_SAMPLES) {
      audio = audio.slice(0, MAX_SAMPLES);
    }

    if (inputNames.length === 1 && inputNames[0] === "source") {
      // MoeSS format: [batch, 1, samples]
      feeds.source = new ort.Tensor("float32", audio, [1, 1, audio.length]);
    } else {
      // Original ContentVec format with multiple inputs
      for (const name of inputNames) {
        if (name === "source") {
          feeds[name] = new ort.Tensor("float32", audio, [1, audio.length]);
        } else if (name === "padding_mask") {
          feeds[name] = new ort.Tensor(
            "bool",
            new Uint8Array(audio.length).fill(0),
            [1, audio.length],
          );
        } else if (name === "output_layer") {
          feeds[name] = new ort.Tensor("int64", new BigInt64Array([12n]), [1]);
        }
      }
    }

    const results = await session.run(feeds);
    const output = results[outputNames[0]] as ort.Tensor;

    // MoeSS output shape: [batch, featureSize, frameCount]
    // Need to transpose to [batch, frameCount, featureSize] then flatten
    let features: Float32Array;
    let frameCount: number;
    let featureSize: number;

    if (output.dims.length === 3) {
      const [batch, dim1, dim2] = output.dims;

      // Detect layout: if dim1 <= 768, it's likely [batch, featureSize, frameCount]
      if (dim1 <= 768 && dim2 > dim1) {
        featureSize = dim1;
        frameCount = dim2;
        // Transpose from [batch, featureSize, frameCount] to [batch, frameCount, featureSize]
        features = transposeFeatures(
          output.data as Float32Array,
          batch,
          featureSize,
          frameCount,
        );
      } else {
        // Already [batch, frameCount, featureSize]
        frameCount = dim1;
        featureSize = dim2;
        features = output.data as Float32Array;
      }
    } else {
      throw new Error(`Unexpected output shape: ${output.dims.join(", ")}`);
    }

    // Apply 2x upsampling (matches RVC: F.interpolate(..., scale_factor=2))
    const upsampled = upsampleFeaturesLinear(features, frameCount, featureSize);

    return {
      hiddenStates: upsampled,
      frameCount,
      upsampledFrameCount: frameCount * 2,
      featureSize,
    };
  } catch (cause) {
    throw new RvcError(ErrorCodes.FEATURE_INFERENCE_FAILED, "ContentVec inference failed.", cause);
  }
}

/**
 * Transpose features from [batch, featureSize, frameCount] to [batch, frameCount, featureSize].
 */
function transposeFeatures(
  data: Float32Array,
  batch: number,
  featureSize: number,
  frameCount: number,
): Float32Array {
  const result = new Float32Array(batch * frameCount * featureSize);

  for (let b = 0; b < batch; b++) {
    for (let f = 0; f < featureSize; f++) {
      for (let t = 0; t < frameCount; t++) {
        // src: [b, f, t]
        const srcIdx = b * featureSize * frameCount + f * frameCount + t;
        // dst: [b, t, f]
        const dstIdx = b * frameCount * featureSize + t * featureSize + f;
        result[dstIdx] = data[srcIdx];
      }
    }
  }

  return result;
}

/**
 * 2x linear upsampling of features.
 * Input: [frameCount, featureSize], Output: [frameCount * 2, featureSize]
 */
function upsampleFeaturesLinear(
  features: Float32Array,
  frameCount: number,
  featureSize: number,
): Float32Array {
  const upsampledCount = frameCount * 2;
  const result = new Float32Array(upsampledCount * featureSize);

  for (let feat = 0; feat < featureSize; feat++) {
    for (let i = 0; i < upsampledCount; i++) {
      // Position in original frame space
      const srcPos = i / 2;
      const srcIdx = Math.floor(srcPos);
      const t = srcPos - srcIdx;

      // Linear interpolation between srcIdx and srcIdx + 1
      const val0 = features[srcIdx * featureSize + feat] ?? 0;
      const val1 = features[(srcIdx + 1) * featureSize + feat] ?? val0;

      result[i * featureSize + feat] = val0 + t * (val1 - val0);
    }
  }

  return result;
}
