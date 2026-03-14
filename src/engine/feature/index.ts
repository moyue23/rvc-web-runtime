export interface HubertFeatures {
  hiddenStates: Float32Array;
  frameCount: number;
  featureSize: number;
  hopSize: number;
}

const DEFAULT_HOP_SIZE = 320;
const DEFAULT_FEATURE_SIZE = 768;

/**
 * Placeholder Stage A implementation.
 * Returns a Hubert-like feature payload so later stages can be wired before the
 * real feature extractor model is integrated.
 */
export async function extractHubertFeatures(audio: Float32Array): Promise<HubertFeatures> {
  const frameCount = Math.max(1, Math.ceil(audio.length / DEFAULT_HOP_SIZE));
  const hiddenStates = new Float32Array(frameCount * DEFAULT_FEATURE_SIZE);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * DEFAULT_HOP_SIZE;
    const end = Math.min(start + DEFAULT_HOP_SIZE, audio.length);
    let energy = 0;

    for (let i = start; i < end; i += 1) {
      energy += Math.abs(audio[i]);
    }

    const meanEnergy = end > start ? energy / (end - start) : 0;
    const rowOffset = frame * DEFAULT_FEATURE_SIZE;
    hiddenStates[rowOffset] = meanEnergy;
  }

  return {
    hiddenStates,
    frameCount,
    featureSize: DEFAULT_FEATURE_SIZE,
    hopSize: DEFAULT_HOP_SIZE,
  };
}
