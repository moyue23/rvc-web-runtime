export type { RmvpePitch } from "./types";

import * as ort from "onnxruntime-web";
import { loadRmvpeModel } from "./model";
import { runRmvpeInference } from "./inference";
import { medianFilterF0, aggressiveMedianFilterF0 } from "./median-filter";
import type { RmvpePitch } from "./types";

export interface EstimatePitchOptions {
  /** RMVPE model: File to load, or pre-loaded session for reuse */
  rmvpe: File | ort.InferenceSession;
  /** Enable F0 median filtering for pitch smoothing (default: true) */
  medianFilter?: boolean;
  /** Window size for median filter (must be odd, default: 3) */
  medianFilterWindow?: number;
  /** Use aggressive median filtering (larger window, stronger smoothing) */
  aggressiveMedianFilter?: boolean;
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

  // Apply median filter if enabled (default: true)
  const medianFilterEnabled = options.medianFilter !== false;
  const aggressiveMode = options.aggressiveMedianFilter === true;
  const windowSize = options.medianFilterWindow ?? (aggressiveMode ? 5 : 3);
  
  let filteredF0 = f0;
  if (medianFilterEnabled) {
    if (aggressiveMode) {
      filteredF0 = aggressiveMedianFilterF0(f0, windowSize);
    } else {
      filteredF0 = medianFilterF0(f0, windowSize);
    }
    // Debug output is now handled inside the filter functions
  }

  return {
    f0: filteredF0,
    frameCount,
    hopSize: 160,
  };
}
