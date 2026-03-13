import type { EngineState, RuntimeContext } from "../types/runtime/runtime";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import { prepareInputAudio } from "../audio";
import { prepareModel } from "../model";

const PIPELINE_STEPS: ReadonlyArray<{ state: EngineState; progress: number }> = [
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
    const { onnxBuffer } = await prepareModel(files.model);
    ctx.onnxBuffer = onnxBuffer;

    updateState(PIPELINE_STEPS[2].state, PIPELINE_STEPS[2].progress);
    // Placeholder: feature extraction should be replaced with Hubert output.
    ctx.hiddenStates = ctx.inputAudio;

    updateState(PIPELINE_STEPS[3].state, PIPELINE_STEPS[3].progress);
    // Placeholder: one fake F0 value per 512 samples.
    ctx.f0 = buildPlaceholderF0(audio.length);

    updateState(PIPELINE_STEPS[4].state, PIPELINE_STEPS[4].progress);
    // Placeholder: synthesis currently passes through the source audio.
    ctx.outputAudio = audio;

    updateState(PIPELINE_STEPS[5].state, PIPELINE_STEPS[5].progress);
    ctx.outputWav = encodeMonoPcmToWav(ctx.outputAudio, sampleRate);

    updateState("success", 100);
    return ctx;
  } catch (error) {
    ctx.state = "failed";
    ctx.progress = 100;
    ctx.errorMessage = normalizeErrorMessage(error);
    callbacks.onStateChange?.(ctx.state, ctx.progress, ctx);
    return ctx;
  }
}

function buildPlaceholderF0(sampleLength: number): Float32Array {
  const frameCount = Math.max(1, Math.ceil(sampleLength / 512));
  const f0 = new Float32Array(frameCount);
  f0.fill(220);
  return f0;
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

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown pipeline error";
}
