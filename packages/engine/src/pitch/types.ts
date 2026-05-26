/** Extracted pitch/F0 features from Stage B. */
export interface RmvpePitch {
  /** F0 values in Hz, one per frame */
  f0: Float32Array;
  /** Number of time frames */
  frameCount: number;
  /** Hop size in samples (160 for RMVPE at 16kHz) */
  hopSize: number;
}
