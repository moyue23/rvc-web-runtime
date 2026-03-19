import type { HubertFeatures } from "../feature";
import type { RmvpePitch } from "../pitch";

/**
 * Compute the actual frame count to process, optionally capped at maxFrames.
 * Uses upsampledFrameCount to match pitch dimensions (features are 2x upsampled).
 */
export function computeFrameCount(
  features: HubertFeatures,
  pitch: RmvpePitch,
  maxFrames?: number,
): number {
  const minFrames = Math.min(features.upsampledFrameCount, pitch.frameCount);
  const cappedFrames = maxFrames !== undefined ? Math.min(minFrames, maxFrames) : minFrames;
  return Math.max(1, cappedFrames);
}
