/**
 * Decodes compressed audio bytes into AudioBuffer via Web Audio API.
 */
export async function decodeToAudioBuffer(buffer: ArrayBuffer): Promise<AudioBuffer> {
  // Implementation...
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(buffer.slice(0));
  } finally {
    await ctx.close();
  }
}
