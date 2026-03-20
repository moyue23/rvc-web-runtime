import type { EngineState, RuntimeContext } from "../types/runtime/runtime";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import * as ort from "onnxruntime-web";
import { prepareInputAudio } from "../audio";
import { processAudioInChunks, type AudioChunkingConfig } from "../chunking";
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

    // Pre-load all models once for reuse
    const [rvcSession, contentVecBuffer, rmvpeBuffer] = await Promise.all([
      createSessionFromOnnxBuffer(onnxBuffer).then((r) => r.session),
      files.contentVec.arrayBuffer(),
      files.rmvpe.arrayBuffer(),
    ]);

    // Create sessions for feature and pitch models
    const [contentVecSession, rmvpeSession] = await Promise.all([
      ort.InferenceSession.create(contentVecBuffer, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      }),
      ort.InferenceSession.create(rmvpeBuffer, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      }),
    ]);

    ctx.modelSession = rvcSession;
    ctx.backend = "wasm";

    // Process audio with chunking (A->B->C per chunk)
    updateState(PIPELINE_STEPS[2].state, PIPELINE_STEPS[2].progress);

    const chunkingConfig: AudioChunkingConfig = {
      chunkDuration: 20, // 20 seconds per chunk
      padDuration: 0.5, // 0.5s mirror padding on each side (RVC default)
      inputSampleRate: 16000,
      outputSampleRate: 48000,
    };

    const outputAudio = await processAudioInChunks(
      audio,
      async (chunk) => {
        // Stage A: Feature Extraction (ContentVec)
        const features = await extractHubertFeatures(chunk.data, {
          contentVec: contentVecSession,
        });

        // Stage B: Pitch Estimation (RMVPE)
        const pitch = await estimatePitch(chunk.data, {
          rmvpe: rmvpeSession,
        });

        // Stage C: Voice Synthesis (RVC)
        const synthesized = await synthesizeVoice(rvcSession, features, pitch);

        return synthesized.audio;
      },
      chunkingConfig,
      (current, total) => {
        const chunkProgress = 50 + Math.floor((current / total) * 42);
        updateState("voice_synthesis", chunkProgress);
      },
    );

    // RVC outputs at model's target sample rate (usually 48kHz)
    ctx.outputAudio = outputAudio;
    ctx.hiddenStates = new Float32Array(0); // Not stored for chunked processing
    ctx.f0 = new Float32Array(0); // Not stored for chunked processing

    updateState(PIPELINE_STEPS[5].state, PIPELINE_STEPS[5].progress);
    ctx.outputWav = encodeMonoPcmToWav(ctx.outputAudio, 48000);

    updateState("success", 100);
    return ctx;
  } catch (error) {
    ctx.state = "failed";
    ctx.progress = 100;

    // Log full error details to console for debugging
    console.error("[Pipeline] Error:", error);
    if (error instanceof Error && "cause" in error) {
      console.error("[Pipeline] Caused by:", (error as { cause?: unknown }).cause);
    }

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
