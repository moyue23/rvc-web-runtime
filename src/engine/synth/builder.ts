import * as ort from "onnxruntime-web";
import type { HubertFeatures } from "../feature";
import type { RmvpePitch } from "../pitch";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { SynthesisFeeds } from "./types";

// Pitch quantization constants from RVC official
const F0_MIN = 50;
const F0_MAX = 1100;
const F0_MEL_MIN = 1127 * Math.log(1 + F0_MIN / 700);
const F0_MEL_MAX = 1127 * Math.log(1 + F0_MAX / 700);

/**
 * Build all input tensors for the synthesis model.
 * Matches RVC ONNX inference: hubert, length, pitch, pitchf, sid, rnd
 */
export function buildSynthesisFeeds(
  features: HubertFeatures,
  pitch: RmvpePitch,
  frameCount: number,
  speakerId: number,
): SynthesisFeeds {
  try {
    return {
      phone: buildPhoneTensor(features, frameCount),
      phone_lengths: buildPhoneLengthsTensor(frameCount),
      pitch: buildPitchTensor(pitch.f0, frameCount),
      nsff0: buildNsff0Tensor(pitch.f0, frameCount),
      sid: buildSpeakerTensor(speakerId),
      rnd: buildRndTensor(frameCount),
    };
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.SYNTH_FEED_BUILD_FAILED,
      `Failed to build synthesis input tensors for ${frameCount} frames: ${cause instanceof Error ? cause.message : "unknown error"}`,
      cause,
    );
  }
}

function buildPhoneTensor(features: HubertFeatures, frameCount: number): ort.Tensor {
  const data = trimFeatureFrames(features.hiddenStates, frameCount, features.featureSize);
  return new ort.Tensor("float32", data, [1, frameCount, features.featureSize]);
}

function buildPhoneLengthsTensor(frameCount: number): ort.Tensor {
  return new ort.Tensor("int64", new BigInt64Array([BigInt(frameCount)]), [1]);
}

function buildPitchTensor(f0: Float32Array, frameCount: number): ort.Tensor {
  const data = buildQuantizedPitch(f0, frameCount);
  return new ort.Tensor("int64", data, [1, frameCount]);
}

function buildNsff0Tensor(f0: Float32Array, frameCount: number): ort.Tensor {
  const data = trimPitchFrames(f0, frameCount);
  return new ort.Tensor("float32", data, [1, frameCount]);
}

function buildSpeakerTensor(speakerId: number): ort.Tensor {
  return new ort.Tensor("int64", new BigInt64Array([BigInt(speakerId)]), [1]);
}

function trimFeatureFrames(
  hiddenStates: Float32Array,
  frameCount: number,
  featureSize: number,
): Float32Array {
  return hiddenStates.slice(0, frameCount * featureSize);
}

function trimPitchFrames(f0: Float32Array, frameCount: number): Float32Array {
  return f0.slice(0, frameCount);
}

function buildQuantizedPitch(f0: Float32Array, frameCount: number): BigInt64Array {
  const values = new BigInt64Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    const f0Hz = f0[i] ?? 0;
    let quantized: number;

    if (f0Hz <= 0) {
      // Unvoiced frame -> 1 (minimum valid value)
      quantized = 1;
    } else {
      // Hz to mel scale
      const f0Mel = 1127 * Math.log(1 + f0Hz / 700);
      // Normalize to 1-255 range
      quantized = (f0Mel - F0_MEL_MIN) * 254 / (F0_MEL_MAX - F0_MEL_MIN) + 1;
      // Clamp
      quantized = Math.max(1, Math.min(255, quantized));
    }

    values[i] = BigInt(Math.round(quantized));
  }

  return values;
}

/** Build random noise tensor for GAN synthesis. Shape: [1, 192, frameCount] */
function buildRndTensor(frameCount: number): ort.Tensor {
  const size = 1 * 192 * frameCount;
  const data = new Float32Array(size);

  // Standard normal distribution (Box-Muller or simple approximation)
  for (let i = 0; i < size; i++) {
    // Simple approximation: (sum of 12 uniform - 6) for standard normal
    let sum = 0;
    for (let j = 0; j < 12; j++) {
      sum += Math.random();
    }
    data[i] = sum - 6;
  }

  return new ort.Tensor("float32", data, [1, 192, frameCount]);
}
