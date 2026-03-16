const CONTENTVEC_PAD_MULTIPLE = 160;

/**
 * Preprocess audio for ContentVec feature extraction.
 */
export function preprocessForContentVec(audio: Float32Array): Float32Array {
  const normalized = zScoreNormalize(audio);
  return padToMultiple(normalized, CONTENTVEC_PAD_MULTIPLE);
}

/** Z-Score normalization: zero mean, unit variance (HuBERT training condition). */
function zScoreNormalize(audio: Float32Array): Float32Array {
  if (audio.length === 0) {
    return new Float32Array(0);
  }

  let sum = 0;
  for (let i = 0; i < audio.length; i++) {
    sum += audio[i];
  }
  const mean = sum / audio.length;

  let variance = 0;
  for (let i = 0; i < audio.length; i++) {
    const diff = audio[i] - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / audio.length);

  const normalized = new Float32Array(audio.length);
  if (std < 1e-8) {
    for (let i = 0; i < audio.length; i++) {
      normalized[i] = audio[i] - mean;
    }
  } else {
    for (let i = 0; i < audio.length; i++) {
      normalized[i] = (audio[i] - mean) / std;
    }
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
