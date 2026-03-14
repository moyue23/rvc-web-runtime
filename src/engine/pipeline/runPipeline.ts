import type { EngineState, RuntimeContext } from "../types/runtime/runtime";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import { prepareInputAudio } from "../audio";
import { extractHubertFeatures } from "../feature";
import { createSessionFromOnnxBuffer, prepareModel } from "../model";
import { estimatePitch } from "../pitch";
import { synthesizeVoice } from "../synth";

interface PipelineStep {
  state: EngineState;
  progress: number;
}

const PIPELINE_STEPS: ReadonlyArray<PipelineStep> = [
  { state: "input_preparation", progress: 10 },
  { state: "model_parsing", progress: 30 },
  { state: "feature_extraction", progress: 50 },
  { state: "pitch_estimation", progress: 65 },
  { state: "voice_synthesis", progress: 80 },
  { state: "post_processing", progress: 92 },
];

/**
 * Runs a minimal end-to-end pipeline skeleton.
 * Current version uses placeholders for model/feature/F0/synth stages and
 * focuses on orchestration, progress tracking, and WAV export.
 */
export async function runPipeline(
  files: PipelineFiles,
  callbacks: PipelineCallbacks = {},
): Promise<RuntimeContext> {
  const ctx: RuntimeContext = { state: "idle", progress: 0 };
  const updateState = (state: EngineState, progress: number) => {
    ctx.state = state;
    ctx.progress = progress;
    callbacks.onStateChange?.(state, progress, ctx);
  };

  try {
    updateState(PIPELINE_STEPS[0].state, PIPELINE_STEPS[0].progress);
    const { audio, sampleRate } = await prepareInputAudio(files.audio);
    ctx.inputAudio = audio;
    ctx.sampleRate = sampleRate;

    updateState(PIPELINE_STEPS[1].state, PIPELINE_STEPS[1].progress);

    const { onnxBuffer, metaData } = await prepareModel(files.model);
    ctx.onnxBuffer = onnxBuffer;
    ctx.modelMetaData = metaData;

    const { session, backend } = await createSessionFromOnnxBuffer(onnxBuffer);
    ctx.modelSession = session;
    ctx.backend = backend;

    updateState(PIPELINE_STEPS[2].state, PIPELINE_STEPS[2].progress);
    const features = await extractHubertFeatures(audio);
    ctx.hiddenStates = features.hiddenStates;

    updateState(PIPELINE_STEPS[3].state, PIPELINE_STEPS[3].progress);
    const pitch = await estimatePitch(audio);
    ctx.f0 = pitch.f0;

    updateState(PIPELINE_STEPS[4].state, PIPELINE_STEPS[4].progress);
    const synthesized = await synthesizeVoice(session, features, pitch);
    ctx.outputAudio = synthesized.audio;

    updateState(PIPELINE_STEPS[5].state, PIPELINE_STEPS[5].progress);
    ctx.outputWav = encodeMonoPcmToWav(ctx.outputAudio, sampleRate);

    updateState("success", 100);
    return ctx;
  } catch (error) {
    ctx.state = "failed";
    ctx.progress = 100;
    ctx.errorMessage = error instanceof Error ? error.message : "Unknown pipeline error";
    callbacks.onStateChange?.(ctx.state, ctx.progress, ctx);
    return ctx;
  }
}

function encodeMonoPcmToWav(audio: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const numChannels = 1;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audio.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < audio.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, audio[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
