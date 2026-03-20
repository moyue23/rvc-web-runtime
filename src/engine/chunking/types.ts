/**
 * Audio-level chunking configuration.
 *
 * Strategy (matching official RVC):
 * - Split audio into chunks with mirror padding on both ends
 * - Each chunk: [chunkDuration + 2*padDuration] seconds
 * - Process each chunk independently through A->B->C
 * - Trim padDuration from both ends of output
 * - Concatenate directly (no crossfade needed)
 */
export interface AudioChunkingConfig {
  /** Duration of each chunk in seconds (default: 20) */
  chunkDuration?: number;
  /** Mirror padding duration on each side in seconds (default: 0.5) */
  padDuration?: number;
  /** Input sample rate in Hz (default: 16000) */
  inputSampleRate?: number;
  /** Output sample rate in Hz (default: 48000) */
  outputSampleRate?: number;
}

/**
 * An audio chunk with padded data for processing.
 */
export interface AudioChunk {
  /** Padded audio data (includes padding on both ends) */
  data: Float32Array;
  /** Original chunk index */
  index: number;
  /** Start time in seconds (original audio, excluding padding) */
  startTime: number;
  /** End time in seconds (original audio, excluding padding) */
  endTime: number;
  /** Whether this is the first chunk */
  isFirst: boolean;
  /** Whether this is the last chunk */
  isLast: boolean;
}

/**
 * A processed audio chunk ready for merging.
 */
export interface ProcessedAudioChunk {
  /** Raw output from RVC (includes padding artifacts) */
  rawOutput: Float32Array;
  /** Original chunk index for ordering */
  index: number;
  /** Expected duration after trimming (seconds) */
  expectedDuration: number;
}

/**
 * Progress callback for chunk processing.
 */
export type AudioChunkProgressCallback = (currentChunk: number, totalChunks: number) => void;

/**
 * Processor function for a single audio chunk.
 * Takes padded audio, returns synthesized audio (still padded).
 */
export type AudioChunkProcessor = (chunk: AudioChunk) => Promise<Float32Array>;
