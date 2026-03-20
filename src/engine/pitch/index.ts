export type { RmvpePitch } from "./types";

import * as ort from "onnxruntime-web";
import { loadRmvpeModel } from "./model";
import { runRmvpeInference } from "./inference";
import type { RmvpePitch } from "./types";

export interface EstimatePitchOptions {
  /** RMVPE model: File to load, or pre-loaded session for reuse */
  rmvpe: File | ort.InferenceSession;
}

/**
 * Estimate pitch using RMVPE.
 *
 * Supports both File (auto-load) and pre-loaded InferenceSession (reuse).
 */
export async function estimatePitch(
  audio: Float32Array,
  options: EstimatePitchOptions,
): Promise<RmvpePitch> {
  // Use provided session or load from File
  const session =
    options.rmvpe instanceof File ? await loadRmvpeModel(options.rmvpe) : options.rmvpe;

  const { f0, frameCount } = await runRmvpeInference(session, audio);

  return {
    f0,
    frameCount,
    hopSize: 160,
  };
}
