export type { HubertFeatures } from "./types";
export type { ModelLoadProgressCallback } from "./model";

import { preprocessForContentVec } from "./preprocess";
import { loadContentVecModel } from "./model";
import { runContentVecInference } from "./inference";
import type { HubertFeatures } from "./types";
import type { ModelLoadProgressCallback } from "./model";

export interface ExtractHubertFeaturesOptions {
  contentVec: File;
  onModelProgress?: ModelLoadProgressCallback;
}

export async function extractHubertFeatures(
  audio: Float32Array,
  options: ExtractHubertFeaturesOptions,
): Promise<HubertFeatures> {
  const processed = preprocessForContentVec(audio);
  const session = await loadContentVecModel(options.contentVec, options.onModelProgress);
  const { hiddenStates, frameCount, featureSize } = await runContentVecInference(
    session,
    processed,
  );

  return {
    hiddenStates,
    frameCount,
    featureSize,
  };
}
