/**
 * EngineState defines the current stage of one pipeline run.
 * Use it for progress UI, logs, and error localization.
 */
export type EngineState =
  // Waiting for input; no work started yet.
  | "idle"
  // Reading and preparing input files/audio.
  | "loading"
  // Converting .pth weights into an ONNX model buffer.
  | "parsing_model"
  // Stage A: content feature extraction (e.g., Hubert).
  | "extracting_feature"
  // Stage B: F0/pitch estimation (e.g., RMVPE).
  | "estimating_f0"
  // Stage C: voice synthesis with the target model.
  | "synthesizing"
  // Mixing, crossfade, limiting, and WAV encoding.
  | "post_processing"
  // Pipeline finished successfully.
  | "done"
  // Pipeline failed; check errorMessage and logs.
  | "error";

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
  // ONNX model bytes converted from .pth.
  onnxBuffer?: ArrayBuffer;
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
