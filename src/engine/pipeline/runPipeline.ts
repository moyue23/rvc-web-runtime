import type { EngineState, RuntimeContext } from "../types/runtime/runtime";
import type { PipelineFiles, PipelineCallbacks } from "../types/contracts/pipeline";
import * as ort from "onnxruntime-web";
import { prepareInputAudio } from "../audio";
import { processAudioInChunks, type AudioChunkingConfig } from "../chunking";
import { extractHubertFeatures } from "../feature";
import { createSessionFromOnnxBuffer, prepareModel } from "../model";
import { estimatePitch } from "../pitch";
import { synthesizeVoice } from "../synth";
import { encodeMonoPcmToWav } from "../post";

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

    const [rvcSession, contentVecBuffer, rmvpeBuffer] = await Promise.all([
      createSessionFromOnnxBuffer(onnxBuffer).then((r) => r.session),
      files.contentVec.arrayBuffer(),
      files.rmvpe.arrayBuffer(),
    ]);

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

    updateState(PIPELINE_STEPS[2].state, PIPELINE_STEPS[2].progress);

    const chunkingConfig: AudioChunkingConfig = {
      chunkDuration: 20,
      padDuration: 0.5,
      inputSampleRate: 16000,
      outputSampleRate: 48000,
    };

    const outputAudio = await processAudioInChunks(
      audio,
      async (chunk) => {
        const features = await extractHubertFeatures(chunk.data, {
          contentVec: contentVecSession,
        });

        const pitch = await estimatePitch(chunk.data, {
          rmvpe: rmvpeSession,
        });

        const synthesized = await synthesizeVoice(rvcSession, features, pitch);
        return synthesized.audio;
      },
      chunkingConfig,
      (current, total) => {
        const chunkProgress = 50 + Math.floor((current / total) * 42);
        updateState("voice_synthesis", chunkProgress);
      },
    );

    ctx.outputAudio = outputAudio;
    ctx.hiddenStates = new Float32Array(0);
    ctx.f0 = new Float32Array(0);

    updateState(PIPELINE_STEPS[5].state, PIPELINE_STEPS[5].progress);
    ctx.outputWav = encodeMonoPcmToWav(ctx.outputAudio, { sampleRate: 48000 });

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
