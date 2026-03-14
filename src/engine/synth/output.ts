import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { SynthesisResult } from "./types";

/**
 * Parse model outputs into SynthesisResult.
 */
export function parseSynthesisOutput(outputs: ort.InferenceSession.ReturnType): SynthesisResult {
  try {
    const audioOutput = outputs.audio;

    if (!(audioOutput instanceof ort.Tensor)) {
      throw new TypeError('Synthesis output "audio" is missing or not a tensor.');
    }

    const audio = flattenAudioOutput(audioOutput);
    const sampleRate = readSampleRate(outputs.sr);

    return { audio, sampleRate };
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.SYNTH_OUTPUT_PARSE_FAILED,
      `Failed to parse synthesis output: ${cause instanceof Error ? cause.message : "unknown error"}`,
      cause,
    );
  }
}

function flattenAudioOutput(audioOutput: ort.Tensor): Float32Array {
  if (!(audioOutput.data instanceof Float32Array)) {
    throw new TypeError('Synthesis output "audio" must be float32.');
  }

  return audioOutput.data;
}

function readSampleRate(output: ort.OnnxValue | undefined): number | undefined {
  if (!(output instanceof ort.Tensor)) {
    return undefined;
  }

  const data = output.data;
  if (data instanceof Float32Array || data instanceof Float64Array) {
    return data.length > 0 ? Math.round(data[0]) : undefined;
  }

  if (data instanceof Int32Array || data instanceof Uint32Array) {
    return data.length > 0 ? data[0] : undefined;
  }

  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    return data.length > 0 ? Number(data[0]) : undefined;
  }

  return undefined;
}
