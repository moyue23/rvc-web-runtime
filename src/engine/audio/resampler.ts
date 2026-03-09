/**
 * Resamples PCM data to 16kHz for feature-extraction model compatibility.
 */
export function resampleTo16k(
  data: Float32Array,
  originalRate: number,
): { audio: Float32Array; sampleRate: number } {
  if (originalRate === 16000) return { audio: data, sampleRate: originalRate };
  // TODO: real resampling; placeholder for pipeline wiring
  return { audio: data, sampleRate: 16000 };
}
