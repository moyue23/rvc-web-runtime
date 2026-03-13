import { readAsArrayBuffer } from "./loader";
import { decodeToAudioBuffer } from "./decoder";
import { downmixToMono } from "./processor";
import { resampleTo16k } from "./resampler";
import type { AudioData } from "./types";

export { readAsArrayBuffer, decodeToAudioBuffer, downmixToMono, resampleTo16k };
export type { AudioData } from "./types";

export async function prepareInputAudio(file: File): Promise<AudioData> {
  const bytes = await readAsArrayBuffer(file);
  const decoded = await decodeToAudioBuffer(bytes);
  const mono = downmixToMono(decoded);
  const audio16k = resampleTo16k(mono, decoded.sampleRate);
  return { audio: audio16k.audio, sampleRate: audio16k.sampleRate };
}
