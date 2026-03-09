/**
 * Pure DSP helpers for waveform processing (e.g., downmix, normalize).
 */
export function downmixToMono(audioBuffer: AudioBuffer): Float32Array {
  if (audioBuffer.numberOfChannels === 1) {
    return new Float32Array(audioBuffer.getChannelData(0));
  }

  const mono = new Float32Array(audioBuffer.length);
  const channels = audioBuffer.numberOfChannels;

  for (let c = 0; c < channels; c += 1) {
    const ch = audioBuffer.getChannelData(c);
    for (let i = 0; i < audioBuffer.length; i += 1) {
      mono[i] += ch[i] / channels;
    }
  }

  return mono;
}
