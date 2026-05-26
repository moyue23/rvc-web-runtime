export type {
  AudioChunkingConfig,
  AudioChunk,
  ProcessedAudioChunk,
  AudioChunkProgressCallback,
  AudioChunkProcessor,
} from "./types";

import type {
  AudioChunkingConfig,
  AudioChunk,
  AudioChunkProgressCallback,
  AudioChunkProcessor,
} from "./types";

const DEFAULT_CHUNK_DURATION = 20; // seconds
const DEFAULT_PAD_DURATION = 0.5; // seconds (RVC default x_pad)
const DEFAULT_INPUT_SAMPLE_RATE = 16000;
const DEFAULT_OUTPUT_SAMPLE_RATE = 48000;

/**
 * Split audio into chunks with mirror padding.
 *
 * Each chunk will have:
 * - Original content: [start, end] (chunkDuration seconds)
 * - Left padding: mirror of [start, start+padDuration]
 * - Right padding: mirror of [end-padDuration, end]
 *
 * @param audio Full audio data at inputSampleRate
 * @param config Chunking configuration
 * @returns Array of padded audio chunks
 */
function splitAudioIntoChunks(audio: Float32Array, config: AudioChunkingConfig = {}): AudioChunk[] {
  const chunkDuration = config.chunkDuration ?? DEFAULT_CHUNK_DURATION;
  const padDuration = config.padDuration ?? DEFAULT_PAD_DURATION;
  const sampleRate = config.inputSampleRate ?? DEFAULT_INPUT_SAMPLE_RATE;

  const chunkSamples = Math.floor(chunkDuration * sampleRate);
  const padSamples = Math.floor(padDuration * sampleRate);

  const totalSamples = audio.length;
  let numChunks = Math.ceil(totalSamples / chunkSamples);

  // Ensure last chunk is at least 10 seconds (to avoid short chunk issues)
  const lastChunkStart = (numChunks - 1) * chunkSamples;
  const lastChunkDuration = (totalSamples - lastChunkStart) / sampleRate;
  const MIN_CHUNK_DURATION = 10; // seconds

  if (numChunks > 1 && lastChunkDuration < MIN_CHUNK_DURATION) {
    // Merge last chunk into previous one
    numChunks = numChunks - 1;
  }

  if (numChunks === 1) {
    // Single chunk - still needs padding for RVC
    return [
      {
        data: padAudioSymmetric(audio, padSamples),
        index: 0,
        startTime: 0,
        endTime: totalSamples / sampleRate,
        isFirst: true,
        isLast: true,
      },
    ];
  }

  const chunks: AudioChunk[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startSample = i * chunkSamples;
    const endSample = Math.min(startSample + chunkSamples, totalSamples);

    // Extract original chunk
    const originalChunk = audio.slice(startSample, endSample);

    // Apply mirror padding
    const paddedChunk = padAudioMirror(originalChunk, padSamples, audio, startSample, endSample);

    chunks.push({
      data: paddedChunk,
      index: i,
      startTime: startSample / sampleRate,
      endTime: endSample / sampleRate,
      isFirst: i === 0,
      isLast: i === numChunks - 1,
    });
  }

  return chunks;
}

/**
 * Pad audio with symmetric reflection (for single chunk).
 */
function padAudioSymmetric(audio: Float32Array, padSamples: number): Float32Array {
  const result = new Float32Array(audio.length + 2 * padSamples);

  // Left padding: mirror of start
  for (let i = 0; i < padSamples; i++) {
    result[padSamples - 1 - i] = audio[Math.min(i, audio.length - 1)];
  }

  // Original audio
  result.set(audio, padSamples);

  // Right padding: mirror of end
  for (let i = 0; i < padSamples; i++) {
    result[padSamples + audio.length + i] = audio[Math.max(0, audio.length - 1 - i)];
  }

  return result;
}

/**
 * Pad audio chunk with mirror padding using neighbor data.
 */
function padAudioMirror(
  chunk: Float32Array,
  padSamples: number,
  fullAudio: Float32Array,
  chunkStart: number,
  chunkEnd: number,
): Float32Array {
  const result = new Float32Array(chunk.length + 2 * padSamples);

  // Left padding: mirror of [chunkStart, chunkStart+padSamples] from full audio
  for (let i = 0; i < padSamples; i++) {
    const sourceIdx = chunkStart + i;
    if (sourceIdx < fullAudio.length) {
      result[padSamples - 1 - i] = fullAudio[sourceIdx];
    } else {
      result[padSamples - 1 - i] = chunk[0];
    }
  }

  // Original chunk
  result.set(chunk, padSamples);

  // Right padding: mirror of [chunkEnd-padSamples, chunkEnd] from full audio
  for (let i = 0; i < padSamples; i++) {
    const sourceIdx = chunkEnd - 1 - i;
    if (sourceIdx >= 0) {
      result[padSamples + chunk.length + i] = fullAudio[sourceIdx];
    } else {
      result[padSamples + chunk.length + i] = chunk[chunk.length - 1];
    }
  }

  return result;
}

/**
 * Merge processed chunks by trimming padding and concatenating.
 *
 * According to Gemini's formula:
 * - Trim padDuration from start and end of each chunk's output
 * - Remaining samples = chunkDuration * outputSampleRate
 * - Concatenate directly without crossfade
 *
 * @param chunks Processed audio chunks (raw RVC output)
 * @param config Chunking configuration
 * @returns Merged audio
 */
function mergeProcessedChunks(
  chunks: Float32Array[],
  config: AudioChunkingConfig = {},
): Float32Array {
  if (chunks.length === 0) {
    return new Float32Array(0);
  }

  const padDuration = config.padDuration ?? DEFAULT_PAD_DURATION;
  const outputSampleRate = config.outputSampleRate ?? DEFAULT_OUTPUT_SAMPLE_RATE;
  const padSamples = Math.floor(padDuration * outputSampleRate);

  // Calculate total length (last chunk may be shorter)
  let totalLength = 0;
  const trimmedChunks: Float32Array[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Trim padding from both ends
    // For first chunk: only trim right padding? No, both ends according to formula
    // For last chunk: only trim left padding? No, both ends
    const trimStart = padSamples;
    const trimEnd = chunk.length - padSamples;

    if (trimStart >= trimEnd) {
      // Chunk too short after trimming, skip or use full
      trimmedChunks.push(chunk);
      totalLength += chunk.length;
      continue;
    }

    const trimmed = chunk.slice(trimStart, trimEnd);
    trimmedChunks.push(trimmed);
    totalLength += trimmed.length;
  }

  // Concatenate
  const result = new Float32Array(totalLength);
  let offset = 0;

  for (const trimmed of trimmedChunks) {
    result.set(trimmed, offset);
    offset += trimmed.length;
  }

  return result;
}

/**
 * Process long audio using chunking with mirror padding.
 *
 * This is the main orchestration function matching official RVC behavior:
 * 1. Split audio into overlapping chunks with mirror padding
 * 2. Process each chunk independently through A->B->C
 * 3. Trim padding artifacts and concatenate
 *
 * @param audio Full audio data at inputSampleRate
 * @param processor Async function to process each chunk (A->B->C)
 * @param config Chunking configuration
 * @param onProgress Optional progress callback
 * @returns Processed audio at outputSampleRate
 */
export async function processAudioInChunks(
  audio: Float32Array,
  processor: AudioChunkProcessor,
  config: AudioChunkingConfig = {},
  onProgress?: AudioChunkProgressCallback,
): Promise<Float32Array> {
  const chunks = splitAudioIntoChunks(audio, config);

  const processedChunks: Float32Array[] = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length);

    // Process this chunk (A->B->C)
    const processed = await processor(chunks[i]);
    processedChunks.push(processed);

    // Yield to main thread to prevent UI blocking
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return mergeProcessedChunks(processedChunks, config);
}
