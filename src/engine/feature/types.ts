export interface HubertFeatures {
  /** Flattened hidden states [frameCount * featureSize]. */
  hiddenStates: Float32Array;
  /** Number of time frames (before upsampling). */
  frameCount: number;
  /** Number of frames after 2x upsampling (for alignment with pitch). */
  upsampledFrameCount: number;
  /** Feature dimension (768 for v2). */
  featureSize: number;
}
