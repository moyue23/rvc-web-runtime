import type * as ort from "onnxruntime-web";
import type { HubertFeatures } from "../feature";
import type { RmvpePitch } from "../pitch";
import type { SynthesisResult, SynthesisOptions } from "./types";
import { buildSynthesisFeeds } from "./builder";
import { parseSynthesisOutput } from "./output";
import { computeFrameCount } from "./aligner";
import { runInference } from "./runner";

export type { SynthesisResult, SynthesisOptions, SynthesisFeeds } from "./types";

export async function synthesizeVoice(
  session: ort.InferenceSession,
  features: HubertFeatures,
  pitch: RmvpePitch,
  options: SynthesisOptions = {},
): Promise<SynthesisResult> {
  const frameCount = computeFrameCount(features, pitch, options.maxFrames);
  const speakerId = options.speakerId ?? 0;
  const feeds = buildSynthesisFeeds(features, pitch, frameCount, speakerId);
  const outputs = await runInference(session, feeds);
  return parseSynthesisOutput(outputs);
}
