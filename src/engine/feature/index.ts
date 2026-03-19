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

/**
 * Extract ContentVec features from audio (Stage A).
 * Applies layer normalization and 2x upsampling to match RVC pipeline.
 */
export async function extractHubertFeatures(
  audio: Float32Array,
  options: ExtractHubertFeaturesOptions,
): Promise<HubertFeatures> {
  const processed = preprocessForContentVec(audio, { normalize: true });
  const session = await loadContentVecModel(options.contentVec, options.onModelProgress);
  return await runContentVecInference(session, processed);
}
