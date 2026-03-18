export type { RmvpePitch } from "./types";

import { loadRmvpeModel } from "./model";
import { runRmvpeInference } from "./inference";
import type { RmvpePitch } from "./types";

export interface EstimatePitchOptions {
  rmvpe: File;
}

/**
 * Estimate pitch using RMVPE.
 */
export async function estimatePitch(
  audio: Float32Array,
  options: EstimatePitchOptions,
): Promise<RmvpePitch> {
  const session = await loadRmvpeModel(options.rmvpe);
  const { f0, frameCount } = await runRmvpeInference(session, audio);

  return {
    f0,
    frameCount,
    hopSize: 160,
  };
}
