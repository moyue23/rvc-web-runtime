export type { HubertFeatures } from "./types";
export type { ModelLoadProgressCallback } from "./model";

import * as ort from "onnxruntime-web";
import { preprocessForContentVec } from "./preprocess";
import { loadContentVecModel } from "./model";
import { runContentVecInference } from "./inference";
import type { HubertFeatures } from "./types";
import type { ModelLoadProgressCallback } from "./model";

export interface ExtractHubertFeaturesOptions {
  /** ContentVec model: File to load, or pre-loaded session for reuse */
  contentVec: File | ort.InferenceSession;
  onModelProgress?: ModelLoadProgressCallback;
}

/**
 * Extract ContentVec features from audio (Stage A).
 * Applies layer normalization and 2x upsampling to match RVC pipeline.
 *
 * Supports both File (auto-load) and pre-loaded InferenceSession (reuse).
 */
export async function extractHubertFeatures(
  audio: Float32Array,
  options: ExtractHubertFeaturesOptions,
): Promise<HubertFeatures> {
  const processed = preprocessForContentVec(audio, { normalize: true });

  // Use provided session or load from File
  const session =
    options.contentVec instanceof File
      ? await loadContentVecModel(options.contentVec, options.onModelProgress)
      : options.contentVec;

  return await runContentVecInference(session, processed);
}
