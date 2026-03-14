import * as ort from "onnxruntime-web";
import type { HubertFeatures } from "../feature";
import type { RmvpePitch } from "../pitch";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";
import type { SynthesisFeeds } from "./types";

/**
 * Build all input tensors for the synthesis model.
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

  for (let i = 0; i < frameCount; i += 1) {
    values[i] = BigInt(Math.max(1, Math.round(f0[i] ?? 1)));
  }

  return values;
}
