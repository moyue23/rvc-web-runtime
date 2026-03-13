import type * as ort from "onnxruntime-web";

/**
 * EngineState defines the current stage of one pipeline run.
 * Use it for progress UI, logs, and error localization.
 */
export type EngineState =
  // Waiting for input; no work started yet.
  | "idle"
  // Validating files, reading bytes, and decoding source audio.
  | "input_preparation"
  // Loading an ONNX model directly, or converting .pth to ONNX first.
  | "model_parsing"
  // Stage A: content feature extraction (e.g., Hubert).
  | "feature_extraction"
  // Stage B: F0/pitch estimation (e.g., RMVPE).
  | "pitch_estimation"
  // Stage C: voice synthesis with the target model.
  | "voice_synthesis"
  // Mixing, crossfade, limiting, and WAV encoding.
  | "post_processing"
  // Pipeline finished successfully.
  | "success"
  // Pipeline failed; check errorMessage and logs.
  | "failed";

/**
 * RuntimeContext is the shared in-memory record for a single task run.
 * Each stage reads from and writes to this object progressively.
 */
export interface RuntimeContext {
  // Current pipeline stage.
  state: EngineState;
  // Task progress in percentage [0, 100].
  progress: number;
  // Decoded source mono PCM data.
  inputAudio?: Float32Array;
  // Sample rate of inputAudio/outputAudio.
  sampleRate?: number;
  // ONNX model bytes used for inference.
  onnxBuffer?: ArrayBuffer;
  // Parsed model metadata when available (e.g. from `.pth` conversion).
  modelMetaData?: RuntimeModelMetaData;
  // Initialized ONNX Runtime session for model inference.
  modelSession?: ort.InferenceSession;
  // Selected execution backend used by the current model session.
  backend?: "webgpu" | "wasm";
  // Content features from stage A.
  hiddenStates?: Float32Array;
  // Fundamental frequency sequence from stage B.
  f0?: Float32Array;
  // Synthesized vocal waveform from stage C.
  outputAudio?: Float32Array;
  // Final downloadable WAV blob from post-processing.
  outputWav?: Blob;
  // Human-readable error summary for UI display.
  errorMessage?: string;
}

/**
 * Model metadata stored in the runtime context for pipeline decisions and UI state.
 */
export interface RuntimeModelMetaData {
  sampleRate: number;
  version: string;
  useF0: boolean;
}
