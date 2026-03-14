export interface RmvpePitch {
  f0: Float32Array;
  frameCount: number;
  hopSize: number;
}

const DEFAULT_HOP_SIZE = 320;
const DEFAULT_F0_HZ = 220;

/**
 * Placeholder Stage B implementation.
 * Returns an RMVPE-like F0 track shape so synthesis input wiring can be
 * defined before real pitch extraction is integrated.
 */
export async function estimatePitch(audio: Float32Array): Promise<RmvpePitch> {
  const frameCount = Math.max(1, Math.ceil(audio.length / DEFAULT_HOP_SIZE));
  const f0 = new Float32Array(frameCount);
  f0.fill(DEFAULT_F0_HZ);

  return {
    f0,
    frameCount,
    hopSize: DEFAULT_HOP_SIZE,
  };
}
