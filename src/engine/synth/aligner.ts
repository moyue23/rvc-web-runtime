import type { HubertFeatures } from "../feature";
import type { RmvpePitch } from "../pitch";

/**
 * Compute the actual frame count to process, optionally capped at maxFrames.
 * Ensures feature and pitch tensors have matching dimensions.
 */
export function computeFrameCount(
  features: HubertFeatures,
  pitch: RmvpePitch,
  maxFrames?: number,
): number {
  const minFrames = Math.min(features.frameCount, pitch.frameCount);
  const cappedFrames = maxFrames !== undefined ? Math.min(minFrames, maxFrames) : minFrames;
  return Math.max(1, cappedFrames);
}
