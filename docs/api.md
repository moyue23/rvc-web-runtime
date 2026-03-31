# RVC-Web-Runtime API Documentation

RVC-Web-Runtime is a **WASM-based Retrieval-based Voice Conversion (RVC)** inference engine that runs entirely in the browser.

> **Note**: This project currently only supports the WASM backend. WebGPU is not supported due to INT64 data type requirements and dynamic shape broadcasting limitations in the RVC ONNX models.

---

## Quick Start

```typescript
import { runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";

// Check Worker support
if (!isWorkerSupported()) {
  alert("Web Workers not supported");
}

// Run inference
const result = await runPipelineInWorker(
  {
    model: modelFile, // .onnx or .pth file
    contentVec: hubertFile, // ContentVec ONNX model
    rmvpe: rmvpeFile, // RMVPE ONNX model
  },
  audioData, // Float32Array, must be 16kHz
  16000, // Sample rate
  {
    onStateChange: (state, progress) => {
      console.log(`${state}: ${progress}%`);
    },
  },
  { timeout: 300000 }, // Optional: 5 minute timeout
);

// Download result
if (result.outputWav) {
  const url = URL.createObjectURL(result.outputWav);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cover.wav";
  a.click();
}
```

---

## API Reference

### runPipelineInWorker()

Runs the complete RVC inference pipeline in a Web Worker off the main thread.

**Function Signature**

```typescript
async function runPipelineInWorker(
  files: Omit<PipelineFiles, "audio">,
  audioData: Float32Array,
  audioSampleRate: number,
  callbacks?: PipelineCallbacks,
  options?: WorkerClientOptions,
): Promise<RuntimeContext>;
```

**Parameters**

| Parameter         | Type                           | Description                          |
| ----------------- | ------------------------------ | ------------------------------------ |
| `files`           | `Omit<PipelineFiles, "audio">` | Model files (without audio)          |
| `audioData`       | `Float32Array`                 | Decoded mono PCM data                |
| `audioSampleRate` | `number`                       | Audio sample rate, **must be 16000** |
| `callbacks`       | `PipelineCallbacks`            | Optional callbacks                   |
| `options`         | `WorkerClientOptions`          | Optional configuration               |

**Returns**

`Promise<RuntimeContext>` - Context object containing complete inference results

---

### PipelineFiles

Model files required for inference.

```typescript
type PipelineFiles = {
  model: File; // RVC model: .onnx or .pth format
  audio: File; // Source audio: .mp3, .wav, etc.
  contentVec: File; // ContentVec/HuBERT feature extraction model (ONNX)
  rmvpe: File; // RMVPE pitch estimation model (ONNX)
  index?: File; // (Optional) Feature index file
};
```

**Note**: `runPipelineInWorker()` accepts `Omit<PipelineFiles, "audio">`, audio data is passed via the `audioData` parameter.

---

### PipelineCallbacks

Pipeline state callbacks.

```typescript
type PipelineCallbacks = {
  onStateChange?: (state: EngineState, progress: number, context: RuntimeContext) => void;
};
```

| Callback        | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| `onStateChange` | Triggered when state or progress changes, `progress` range [0, 100] |

---

### WorkerClientOptions

Worker client configuration.

```typescript
interface WorkerClientOptions {
  timeout?: number; // Timeout in milliseconds, default 300000 (5 minutes)
}
```

---

### RuntimeContext

Runtime context, passed through the entire inference process.

```typescript
interface RuntimeContext {
  // State and progress
  state: EngineState; // Current stage
  progress: number; // Progress percentage [0, 100]

  // Input data
  inputAudio?: Float32Array; // Decoded source audio
  sampleRate?: number; // Sample rate (usually 16000)

  // Model related
  onnxBuffer?: ArrayBuffer; // ONNX model bytes
  modelMetaData?: RuntimeModelMetaData; // Model metadata
  modelSession?: ort.InferenceSession; // ONNX Runtime session

  // Intermediate results
  hiddenStates?: Float32Array; // Stage A: HuBERT features
  f0?: Float32Array; // Stage B: Pitch sequence

  // Output results
  outputAudio?: Float32Array; // Stage C: Synthesized audio
  outputWav?: Blob; // Final WAV file

  // Error info
  errorMessage?: string; // Error description on failure
}
```

---

### EngineState

Pipeline stage enum.

| State                | Description                                |
| -------------------- | ------------------------------------------ |
| `idle`               | Idle state, waiting for input              |
| `input_preparation`  | Decoding source audio                      |
| `model_parsing`      | Loading model (or converting .pth -> ONNX) |
| `feature_extraction` | Stage A: Extract HuBERT features           |
| `pitch_estimation`   | Stage B: RMVPE pitch estimation            |
| `voice_synthesis`    | Stage C: ONNX inference synthesis          |
| `post_processing`    | Post-processing (mixing, WAV encoding)     |
| `success`            | Inference completed successfully           |
| `failed`             | Inference failed                           |

---

### isWorkerSupported()

Check if the current browser supports Web Workers.

```typescript
function isWorkerSupported(): boolean;
```

---

## Error Codes

All errors are thrown via `RvcError`, containing `code` and `message`.

### Audio Related

| Error Code                    | Description              |
| ----------------------------- | ------------------------ |
| `AUDIO_FILE_EMPTY`            | Audio file is empty      |
| `AUDIO_INVALID_TYPE`          | Unsupported audio format |
| `AUDIO_FILE_READ_FAILED`      | File read failed         |
| `AUDIO_DECODE_FAILED`         | Audio decoding failed    |
| `AUDIO_RESAMPLE_INVALID_RATE` | Invalid resampling rate  |

### Model Related

| Error Code                    | Description                       |
| ----------------------------- | --------------------------------- |
| `MODEL_FILE_EMPTY`            | Model file is empty               |
| `MODEL_UNSUPPORTED_FORMAT`    | Unsupported model format          |
| `MODEL_READ_FAILED`           | Model file read failed            |
| `MODEL_CONVERTER_UNAVAILABLE` | .pth converter unavailable        |
| `MODEL_CONVERSION_FAILED`     | .pth -> ONNX conversion failed    |
| `MODEL_VERIFY_SESSION_FAILED` | Model session verification failed |

### Feature Extraction Related

| Error Code                  | Description                  |
| --------------------------- | ---------------------------- |
| `FEATURE_MODEL_LOAD_FAILED` | ContentVec model load failed |
| `FEATURE_PREPROCESS_FAILED` | Audio preprocessing failed   |
| `FEATURE_INFERENCE_FAILED`  | Feature inference failed     |
| `FEATURE_INVALID_AUDIO`     | Invalid audio data           |

### Pitch Estimation Related

| Error Code                | Description             |
| ------------------------- | ----------------------- |
| `PITCH_MODEL_LOAD_FAILED` | RMVPE model load failed |
| `PITCH_INFERENCE_FAILED`  | Pitch inference failed  |

### Voice Synthesis Related

| Error Code                  | Description              |
| --------------------------- | ------------------------ |
| `SYNTH_FEED_BUILD_FAILED`   | Model input build failed |
| `SYNTH_INFERENCE_FAILED`    | ONNX inference failed    |
| `SYNTH_OUTPUT_PARSE_FAILED` | Output parsing failed    |

### Worker Related

| Error Code             | Description          |
| ---------------------- | -------------------- |
| `WORKER_TIMEOUT`       | Inference timeout    |
| `WORKER_UNKNOWN_ERROR` | Worker unknown error |

---

## Important Limitations

### Sample Rate Requirement

**ContentVec/HuBERT models strictly require 16kHz input**. Other sample rates will cause feature extraction failures or incorrect output.

### Audio Length

Long audio is automatically chunked to prevent memory overflow (OOM). Chunking is handled at the pipeline level to ensure frame alignment between feature extraction and pitch estimation.

### Browser Support

- **WASM SIMD**: Chrome 91+, Firefox 89+, Safari 16.4+
- **WASM Multi-threading**: Requires COOP/COEP headers + SharedArrayBuffer
- **Web Workers**: All modern browsers

---

## Example: Complete Inference Flow

```typescript
import { runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";
import { prepareInputAudio } from "rvc-web-runtime/audio";

async function convertVoice(
  modelFile: File,
  audioFile: File,
  contentVecFile: File,
  rmvpeFile: File,
) {
  // 1. Check support
  if (!isWorkerSupported()) {
    throw new Error("Web Workers not supported");
  }

  // 2. Prepare audio (decode + resample to 16kHz)
  const { audio: audioData, sampleRate } = await prepareInputAudio(audioFile);

  // 3. Run inference
  const ctx = await runPipelineInWorker(
    { model: modelFile, contentVec: contentVecFile, rmvpe: rmvpeFile },
    audioData,
    sampleRate,
    {
      onStateChange: (state, progress) => {
        updateUI(state, progress);
      },
    },
    { timeout: 600000 }, // 10 minute timeout (long songs)
  );

  // 4. Handle result
  if (ctx.state === "success" && ctx.outputWav) {
    return ctx.outputWav;
  }

  throw new Error(ctx.errorMessage || "Inference failed");
}
```

---

## WebGPU Compatibility Notes (Future)

Although the current version only supports the WASM backend, the code structure retains WebGPU support interfaces. WebGPU could be re-enabled if the following issues are resolved:

1. ONNX Runtime Web supports INT64 data type conversion
2. RVC models are exported without dynamic shape broadcasting
3. WebGPU operator fallback mechanism becomes more reliable

Currently, WASM + SIMD + multi-threading is recommended, which provides sufficient performance for most RVC scenarios.
