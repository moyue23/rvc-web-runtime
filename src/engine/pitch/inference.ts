import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

// RMVPE parameters matching official RVC implementation
const RMVPE_PARAMS = {
  nMels: 128,
  nFft: 1024,
  hopLength: 160,
  sampleRate: 16000,
  fMin: 30,
  fMax: 8000,
  nClass: 360, // Output dimension of RMVPE
  centsPerBin: 20,
  centsOffset: 1997.3794084376191,
  threshold: 0.03, // Default threshold for voicing detection
} as const;

/**
 * Compute mel spectrogram from audio for RMVPE input.
 * Uses standard HTK mel filterbank with 128 bins, fmin=30Hz, fmax=8000Hz.
 */
export function computeMelSpectrogram(audio: Float32Array): Float32Array {
  const { nMels, nFft, hopLength, sampleRate, fMin, fMax } = RMVPE_PARAMS;

  const numFrames = Math.ceil(audio.length / hopLength);
  const melSpec = new Float32Array(numFrames * nMels);

  // Precompute mel filterbank
  const melFilterbank = createMelFilterbank(nFft, nMels, sampleRate, fMin, fMax);

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopLength;

    // Apply Hann window and compute FFT
    const windowed = applyHannWindow(audio, start, nFft);

    // Compute magnitude spectrum using FFT
    const magnitudes = computeMagnitudesFFT(windowed);

    // Apply mel filterbank
    const melFrame = frame * nMels;
    for (let mel = 0; mel < nMels; mel++) {
      let sum = 0;
      const filter = melFilterbank[mel];
      for (let i = 0; i < filter.length; i++) {
        sum += magnitudes[i] * filter[i];
      }
      // Log compression with clamp
      melSpec[melFrame + mel] = Math.log(Math.max(1e-5, sum));
    }
  }

  return melSpec;
}

/**
 * Create mel filterbank using HTK formula.
 * mel(f) = 2595 * log10(1 + f/700)
 */
function createMelFilterbank(
  nFft: number,
  nMels: number,
  sampleRate: number,
  fMin: number,
  fMax: number,
): Float32Array[] {
  const nFftHalf = Math.floor(nFft / 2) + 1;

  // Convert Hz to mel
  const melMin = hzToMel(fMin);
  const melMax = hzToMel(fMax);

  // Create mel points evenly spaced
  const melPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = melMin + (i * (melMax - melMin)) / (nMels + 1);
  }

  // Convert mel points back to FFT bin indices
  const binPoints = new Int32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) {
    const freq = melToHz(melPoints[i]);
    binPoints[i] = Math.floor(((nFft + 1) * freq) / sampleRate);
    binPoints[i] = Math.max(0, Math.min(binPoints[i], nFftHalf - 1));
  }

  // Create filterbank
  const filterbank: Float32Array[] = [];
  for (let mel = 0; mel < nMels; mel++) {
    const filter = new Float32Array(nFftHalf);
    const left = binPoints[mel];
    const center = binPoints[mel + 1];
    const right = binPoints[mel + 2];

    // Rising slope
    for (let i = left; i < center; i++) {
      filter[i] = (i - left) / (center - left);
    }
    // Falling slope
    for (let i = center; i < right; i++) {
      filter[i] = (right - i) / (right - center);
    }

    filterbank.push(filter);
  }

  return filterbank;
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function applyHannWindow(audio: Float32Array, start: number, nFft: number): Float32Array {
  const windowed = new Float32Array(nFft);
  const audioLen = audio.length;

  for (let i = 0; i < nFft; i++) {
    const audioIdx = start + i;
    if (audioIdx < audioLen) {
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nFft - 1));
      windowed[i] = audio[audioIdx] * hann;
    } else {
      windowed[i] = 0;
    }
  }

  return windowed;
}

/**
 * Compute magnitude spectrum using FFT.
 * Uses Cooley-Tukey iterative FFT algorithm.
 */
function computeMagnitudesFFT(frame: Float32Array): Float32Array {
  const n = frame.length;
  const nHalf = Math.floor(n / 2) + 1;

  // Copy frame to complex array [real, imag, real, imag, ...]
  const complex = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    complex[i * 2] = frame[i];
    complex[i * 2 + 1] = 0;
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempReal = complex[i * 2];
      const tempImag = complex[i * 2 + 1];
      complex[i * 2] = complex[j * 2];
      complex[i * 2 + 1] = complex[j * 2 + 1];
      complex[j * 2] = tempReal;
      complex[j * 2 + 1] = tempImag;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // FFT computation
  for (let stage = 2; stage <= n; stage <<= 1) {
    const angleStep = (-2 * Math.PI) / stage;
    const wRealStep = Math.cos(angleStep);
    const wImagStep = Math.sin(angleStep);

    for (let group = 0; group < n; group += stage) {
      let wReal = 1;
      let wImag = 0;
      const halfStage = stage >> 1;

      for (let i = 0; i < halfStage; i++) {
        const evenIdx = (group + i) * 2;
        const oddIdx = (group + i + halfStage) * 2;

        const evenReal = complex[evenIdx];
        const evenImag = complex[evenIdx + 1];
        const oddReal = complex[oddIdx];
        const oddImag = complex[oddIdx + 1];

        // Butterfly: odd * w
        const twiddledReal = oddReal * wReal - oddImag * wImag;
        const twiddledImag = oddReal * wImag + oddImag * wReal;

        complex[evenIdx] = evenReal + twiddledReal;
        complex[evenIdx + 1] = evenImag + twiddledImag;
        complex[oddIdx] = evenReal - twiddledReal;
        complex[oddIdx + 1] = evenImag - twiddledImag;

        // Update twiddle factor
        const nextWReal = wReal * wRealStep - wImag * wImagStep;
        const nextWImag = wReal * wImagStep + wImag * wRealStep;
        wReal = nextWReal;
        wImag = nextWImag;
      }
    }
  }

  // Compute magnitudes (only need first n/2+1 points)
  const magnitudes = new Float32Array(nHalf);
  for (let i = 0; i < nHalf; i++) {
    const real = complex[i * 2];
    const imag = complex[i * 2 + 1];
    magnitudes[i] = Math.sqrt(real * real + imag * imag);
  }

  return magnitudes;
}

/**
 * Decode RMVPE output (360-dim salience) to F0 values.
 * Uses local weighted average of cents as in original RMVPE.
 */
function decodeSalienceToF0(
  salience: Float32Array,
  frameCount: number,
  threshold: number,
): Float32Array {
  const { nClass, centsPerBin, centsOffset } = RMVPE_PARAMS;

  // Create cents mapping: 20 * arange(360) + 1997.3794084376191
  // Pad by 4 on each side for local average computation
  const centsMapping = new Float32Array(nClass + 8);
  for (let i = 0; i < nClass + 8; i++) {
    centsMapping[i] = centsPerBin * (i - 4) + centsOffset;
  }

  const f0 = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    const frameOffset = frame * nClass;

    // Find center bin (argmax)
    let maxVal = -Infinity;
    let center = 0;
    for (let i = 0; i < nClass; i++) {
      const val = salience[frameOffset + i];
      if (val > maxVal) {
        maxVal = val;
        center = i;
      }
    }

    // If max value below threshold, mark as unvoiced (0 Hz)
    if (maxVal <= threshold) {
      f0[frame] = 0;
      continue;
    }

    // Local weighted average with 9-bin window (center +/- 4)
    const startIdx = center; // center in original is at index +4 in padded
    let productSum = 0;
    let weightSum = 0;

    for (let i = 0; i < 9; i++) {
      const binIdx = startIdx + i; // +i -4 +4 = +i, range: center-4 to center+4
      const salienceVal = binIdx >= 0 && binIdx < nClass ? salience[frameOffset + binIdx] : 0;
      productSum += salienceVal * centsMapping[center + i]; // center + i - 4 + 4
      weightSum += salienceVal;
    }

    const cents = weightSum > 0 ? productSum / weightSum : 0;

    // Convert cents to Hz: f0 = 10 * (2^(cents/1200))
    // When cents is 0 (unvoiced), f0 becomes 10 * 1 = 10, which we map to 0
    if (cents <= 0) {
      f0[frame] = 0;
    } else {
      const hz = 10 * Math.pow(2, cents / 1200);
      f0[frame] = hz;
    }
  }

  return f0;
}

/**
 * Pad mel spectrogram to be divisible by 32 for RMVPE model.
 * Required by the U-Net architecture.
 */
function padMelSpectrogram(melSpec: Float32Array, nMels: number): Float32Array {
  const numFrames = melSpec.length / nMels;
  const targetFrames = 32 * Math.ceil(numFrames / 32);
  const padFrames = targetFrames - numFrames;

  if (padFrames === 0) {
    return melSpec;
  }

  const padded = new Float32Array(targetFrames * nMels);
  padded.set(melSpec);
  // Zero padding
  padded.fill(0, melSpec.length);

  return padded;
}

/**
 * Run RMVPE inference and return F0 values.
 */
export async function runRmvpeInference(
  session: ort.InferenceSession,
  audio: Float32Array,
): Promise<{ f0: Float32Array; frameCount: number }> {
  try {
    // Compute mel spectrogram
    const melSpec = computeMelSpectrogram(audio);
    const { nMels, hopLength, threshold } = RMVPE_PARAMS;
    const numFrames = Math.ceil(audio.length / hopLength);

    // Pad to multiple of 32 for model
    const paddedMelSpec = padMelSpectrogram(melSpec, nMels);
    const paddedFrames = paddedMelSpec.length / nMels;

    // RMVPE expects input shape [1, nMels, nFrames]
    const melTensor = new ort.Tensor("float32", paddedMelSpec, [1, nMels, paddedFrames]);
    const results = await session.run({ mel: melTensor });

    // Get output (360-dim salience map, not direct F0)
    const outputName = session.outputNames[0] ?? "hidden";
    const salienceTensor = results[outputName] as ort.Tensor;
    const salienceData = salienceTensor.data as Float32Array;

    // Verify output dimensions
    if (salienceTensor.dims.length !== 3 || salienceTensor.dims[1] !== RMVPE_PARAMS.nClass) {
      throw new Error(
        `Unexpected RMVPE output shape: [${salienceTensor.dims.join(", ")}], ` +
          `expected [batch, ${RMVPE_PARAMS.nClass}, frames]`,
      );
    }

    const outputFrames = salienceTensor.dims[2];

    // Decode salience to F0
    const f0All = decodeSalienceToF0(salienceData, outputFrames, threshold);

    // Trim to original frame count and clamp to valid range
    const f0 = new Float32Array(numFrames);
    for (let i = 0; i < numFrames; i++) {
      const hz = i < f0All.length ? f0All[i] : 0;
      // Clamp to valid F0 range for singing (50-1100 Hz)
      f0[i] = hz >= 50 && hz <= 1100 ? hz : 0;
    }

    return { f0, frameCount: numFrames };
  } catch (cause) {
    throw new RvcError(ErrorCodes.PITCH_INFERENCE_FAILED, "RMVPE inference failed.", cause);
  }
}
