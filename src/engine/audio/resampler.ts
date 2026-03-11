import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/**
 * Resamples PCM data to 16kHz for feature-extraction model compatibility.
 */
export function resampleTo16k(
  data: Float32Array,
  originalRate: number,
): { audio: Float32Array; sampleRate: number } {
  const TARGET_RATE = 16000;

  if (!Number.isFinite(originalRate) || originalRate <= 0) {
    throw new RvcError(
      ErrorCodes.RESAMPLE_INVALID_RATE,
      `Invalid input sample rate: ${originalRate}.`,
    );
  }

  if (originalRate === TARGET_RATE) {
    return { audio: data, sampleRate: originalRate };
  }

  if (data.length === 0) {
    return { audio: new Float32Array(0), sampleRate: TARGET_RATE };
  }

  const ratio = originalRate / TARGET_RATE;
  const outputLength = Math.max(1, Math.round(data.length / ratio));
  const output = new Float32Array(outputLength);
  const lastIndex = data.length - 1;

  for (let i = 0; i < outputLength; i += 1) {
    const sourcePos = i * ratio;
    const left = Math.floor(sourcePos);
    const right = Math.min(left + 1, lastIndex);
    const t = sourcePos - left;

    output[i] = data[left] * (1 - t) + data[right] * t;
  }

  return { audio: output, sampleRate: TARGET_RATE };
}
