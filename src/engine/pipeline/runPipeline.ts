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

const PIPELINE_STAGES: ReadonlyArray<EngineState> = [
  "input_preparation",
  "model_parsing",
  "feature_extraction",
  "pitch_estimation",
  "voice_synthesis",
  "post_processing",
];

interface PreDecodedAudio {
  data: Float32Array;
  sampleRate: number;
}

export async function runPipeline(
  files: PipelineFiles,
  callbacks: PipelineCallbacks = {},
  preDecodedAudio?: PreDecodedAudio,
): Promise<RuntimeContext> {
  const ctx: RuntimeContext = { state: "idle" };

  const emitStage = (state: EngineState) => {
    ctx.state = state;
    callbacks.onEvent?.({ type: "stage", stage: state });
  };

  try {
    emitStage(PIPELINE_STAGES[0]);

    let audio: Float32Array;
    let sampleRate: number;

    if (preDecodedAudio) {
      audio = preDecodedAudio.data;
      sampleRate = preDecodedAudio.sampleRate;
    } else {
      const result = await prepareInputAudio(files.audio);
      audio = result.audio;
      sampleRate = result.sampleRate;
    }

    ctx.inputAudio = audio;
    ctx.sampleRate = sampleRate;

    emitStage(PIPELINE_STAGES[1]);
    const { onnxBuffer, metaData } = await prepareModel(files.model);
    ctx.onnxBuffer = onnxBuffer;
    ctx.modelMetaData = metaData;

    // Pre-load all models once for reuse
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

    emitStage(PIPELINE_STAGES[2]);

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
        callbacks.onEvent?.({ type: "chunk", current, total });
      },
    );

    ctx.outputAudio = outputAudio;
    ctx.hiddenStates = new Float32Array(0);
    ctx.f0 = new Float32Array(0);

    emitStage(PIPELINE_STAGES[5]);
    ctx.outputWav = encodeMonoPcmToWav(ctx.outputAudio, { sampleRate: 48000 });

    emitStage("success");
    return ctx;
  } catch (error) {
    ctx.state = "failed";
    ctx.errorMessage = error instanceof Error ? error.message : "Unknown pipeline error";
    if (error instanceof Error) {
      ctx.errorCode = (error as { code?: string }).code ?? "UNKNOWN_ERROR";
    }
    callbacks.onEvent?.({ type: "stage", stage: "failed" });
    return ctx;
  }
}
