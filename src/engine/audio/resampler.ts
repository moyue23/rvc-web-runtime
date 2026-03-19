import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { AudioData } from "./types";

/**
 * Resamples PCM data to 16kHz for feature-extraction model compatibility.
 */
export function resampleTo16k(data: Float32Array, originalRate: number): AudioData {
  const TARGET_RATE = 16000;
  const resampled = resampleAudio(data, originalRate, TARGET_RATE);
  return { audio: resampled, sampleRate: TARGET_RATE };
}

/**
 * Resamples PCM data to target sample rate using linear interpolation.
 */
function resampleAudio(
  data: Float32Array,
  originalRate: number,
  targetRate: number,
): Float32Array {
  if (!Number.isFinite(originalRate) || originalRate <= 0) {
    throw new RvcError(
      ErrorCodes.AUDIO_RESAMPLE_INVALID_RATE,
      `Invalid input sample rate: ${originalRate}.`,
    );
  }

  if (!Number.isFinite(targetRate) || targetRate <= 0) {
    throw new RvcError(
      ErrorCodes.AUDIO_RESAMPLE_INVALID_RATE,
      `Invalid target sample rate: ${targetRate}.`,
    );
  }

  if (originalRate === targetRate) {
    return data;
  }

  if (data.length === 0) {
    return new Float32Array(0);
  }

  const ratio = originalRate / targetRate;
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

  return output;
}
