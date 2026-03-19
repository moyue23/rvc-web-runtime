const CONTENTVEC_PAD_MULTIPLE = 160;

export interface ContentVecOptions {
  /** Whether to apply layer normalization (RVC uses this). */
  normalize?: boolean;
}

/**
 * Preprocess audio for ContentVec feature extraction.
 * Matches RVC official: uses layer_norm if normalize=true.
 */
export function preprocessForContentVec(
  audio: Float32Array,
  options: ContentVecOptions = {},
): Float32Array {
  const { normalize = true } = options;
  const processed = normalize ? layerNormalize(audio) : audio;
  return padToMultiple(processed, CONTENTVEC_PAD_MULTIPLE);
}

/**
 * Layer normalization: normalize across the entire sequence.
 * Equivalent to F.layer_norm in PyTorch.
 */
function layerNormalize(audio: Float32Array): Float32Array {
  if (audio.length === 0) {
    return new Float32Array(0);
  }

  // Compute mean
  let sum = 0;
  for (let i = 0; i < audio.length; i++) {
    sum += audio[i];
  }
  const mean = sum / audio.length;

  // Compute variance
  let variance = 0;
  for (let i = 0; i < audio.length; i++) {
    const diff = audio[i] - mean;
    variance += diff * diff;
  }

  // Layer norm uses unbiased=False (same as PyTorch default)
  const std = Math.sqrt(variance / audio.length + 1e-5);

  // Normalize
  const normalized = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    normalized[i] = (audio[i] - mean) / std;
  }

  return normalized;
}

/** Pad audio length to multiple (160 for ContentVec conv frontend). */
function padToMultiple(audio: Float32Array, multiple: number): Float32Array {
  const remainder = audio.length % multiple;
  if (remainder === 0) {
    return audio;
  }

  const padding = multiple - remainder;
  const padded = new Float32Array(audio.length + padding);
  padded.set(audio);
  padded.fill(0, audio.length);

  return padded;
}
