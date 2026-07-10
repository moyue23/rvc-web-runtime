# RVC-Web-Runtime API Documentation

RVC-Web-Runtime is a **WASM-based Retrieval-based Voice Conversion (RVC)** inference engine that runs entirely in the browser.

> **Note**: This project currently only supports the WASM backend. WebGPU is not supported due to INT64 data type requirements and dynamic shape broadcasting limitations in the RVC ONNX models.

---

## Quick Start

```typescript
import { createRVC, runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";

// Check Worker support
if (!isWorkerSupported()) {
  alert("Web Workers not supported");
}

// Create runtime context (defaults to jsDelivr CDN)
const rvc = createRVC();
// Or with custom CDN: createRVC({ assetBaseUrl: "https://your-cdn.com/rvc/" })

// Run inference
const result = await runPipelineInWorker(
  rvc,
  {
    model: modelFile, // .onnx or .pth file
    contentVec: hubertFile, // ContentVec ONNX model
    rmvpe: rmvpeFile, // RMVPE ONNX model
  },
  audioData, // Float32Array, must be 16kHz
  16000, // Sample rate
  {
    onEvent: (event) => {
      if (event.type === "stage") {
        console.log(`Stage: ${event.stage}`);
      } else if (event.type === "chunk") {
        console.log(`Chunk ${event.current}/${event.total}`);
      }
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

### createRVC()

Creates a runtime context that configures asset URLs for the engine.

**Function Signature**

```typescript
function createRVC(config?: RvcConfig): RvcContext;
```

**Parameters**

| Parameter | Type        | Description          |
| --------- | ----------- | -------------------- |
| `config`  | `RvcConfig` | Optional. See below. |

**RvcConfig**

```typescript
interface RvcConfig {
  assetBaseUrl?: string; // Base URL where worker + WASM files are hosted
}
```

If `assetBaseUrl` is omitted, jsDelivr CDN is used by default: `https://cdn.jsdelivr.net/npm/rvc-web-runtime@{version}/dist/`.

**RvcContext**

```typescript
interface RvcContext {
  readonly assetBaseUrl: string; // Resolved base URL (trailing / guaranteed)
  readonly workerUrl: string; // Full URL to inference.worker.js
}
```

> **How the worker is loaded**: `workerUrl` is **not** passed directly to `new Worker()`.
> Browsers forbid constructing a module Worker from a cross-origin URL (the script
> throws `SecurityError`). Instead, the client `fetch()`es the script text, wraps it
> in a same-origin `Blob` URL, and constructs the Worker from that. As a consequence:
>
> - The host serving `workerUrl` **must return CORS headers** (e.g.
>   `Access-Control-Allow-Origin: *`). jsDelivr and most CDNs do this by default;
>   self-hosted origins must be configured accordingly, otherwise
>   `WORKER_FETCH_FAILED` is thrown.
> - If your page ships a `Content-Security-Policy`, add `blob:` to `worker-src`
>   (e.g. `worker-src 'self' blob:;`), otherwise the Blob URL Worker is blocked.
> - `assetBaseUrl` is forwarded into the worker and used as `ort.env.wasm.wasmPaths`,
>   because `self.location` inside a Blob worker is a `blob:` URL and cannot be
>   used to locate the WASM files.

---

### runPipelineInWorker()

Runs the complete RVC inference pipeline in a Web Worker off the main thread.

**Function Signature**

```typescript
async function runPipelineInWorker(
  ctx: RvcContext,
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
| `ctx`             | `RvcContext`                   | Runtime context from `createRVC()`   |
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

### PipelineEvent

Events emitted by the pipeline.

```typescript
type PipelineEvent =
  | { type: "stage"; stage: EngineState } // Pipeline entered a new stage
  | { type: "chunk"; current: number; total: number }; // Chunk completed
```

| Event Type | Fields               | Description                          |
| ---------- | -------------------- | ------------------------------------ |
| `stage`    | `stage: EngineState` | Pipeline entered a new stage         |
| `chunk`    | `current`, `total`   | Chunk `current` of `total` completed |

---

### PipelineCallbacks

Pipeline event callbacks.

```typescript
type PipelineCallbacks = {
  onEvent?: (event: PipelineEvent) => void;
};
```

| Callback  | Description                                              |
| --------- | -------------------------------------------------------- |
| `onEvent` | Triggered when pipeline stage changes or chunk completes |

---

### WorkerClientOptions

Worker client configuration.

```typescript
interface WorkerClientOptions {
  timeout?: number; // Timeout in milliseconds, default 300000 (5 minutes)
  speakerId?: number; // Speaker ID for multi-speaker models, default 0
  pitchShift?: number; // Pitch shift in semitones, default 0
  medianFilter?: boolean; // Enable F0 median filtering for pitch smoothing, default true
  medianFilterWindow?: number; // Window size for median filter (must be odd), default 3
  aggressiveMedianFilter?: boolean; // Use aggressive median filtering (stronger smoothing), default false
  chunkDuration?: number; // Chunk duration in seconds, default 20
  padDuration?: number; // Padding duration in seconds, default 0.5
  inputSampleRate?: number; // Input sample rate, default 16000
  outputSampleRate?: number; // Output sample rate, default 48000
}
```

### F0 Median Filtering

F0 median filtering is a pitch smoothing technique that reduces pitch jitter and spikes in the estimated pitch curve. This feature is particularly useful for:

- **Stabilizing unstable pitch**: Reduces pitch wobble in amateur singing or emotional speech
- **Removing pitch spikes**: Filters out isolated pitch jumps that cause artifacts
- **Improving overall smoothness**: Creates more natural-sounding pitch transitions

**Two filtering modes available:**

1. **Standard Mode** (`medianFilter: true`):
   - Window size: 3 (default, can be adjusted with `medianFilterWindow`)
   - Light smoothing suitable for most cases
   - Minimal impact on natural pitch variations

2. **Aggressive Mode** (`aggressiveMedianFilter: true`):
   - Window size: 5 (default, can be adjusted with `medianFilterWindow`)
   - Stronger smoothing for problematic audio
   - More effective at removing significant pitch spikes

**Debug Output**: When enabled, the filter logs statistics to console:

- Number of frames changed
- Percentage of affected frames
- Total and average frequency delta
- Maximum change and its location

**Example Usage**:

```typescript
const result = await runPipelineInWorker(rvc, files, audioData, 16000, callbacks, {
  medianFilter: true, // Enable pitch smoothing
  medianFilterWindow: 5, // Use larger window for stronger smoothing
  aggressiveMedianFilter: false, // Use standard mode
});
```

---

### RuntimeContext

Runtime context, passed through the entire inference process.

```typescript
interface RuntimeContext {
  // State
  state: EngineState; // Current stage

  // Input data
  inputAudio?: Float32Array; // Decoded source audio
  sampleRate?: number; // Sample rate (usually 16000)

  // Model related
  onnxBuffer?: ArrayBuffer; // ONNX model bytes
  modelMetaData?: RuntimeModelMetaData; // Model metadata
  modelSession?: ort.InferenceSession; // ONNX Runtime session
  backend?: "webgpu" | "wasm"; // Execution backend used by the model session

  // Intermediate results
  hiddenStates?: Float32Array; // Stage A: HuBERT features
  f0?: Float32Array; // Stage B: Pitch sequence

  // Output results
  outputAudio?: Float32Array; // Stage C: Synthesized audio
  outputWav?: Blob; // Final WAV file

  // Error info
  errorMessage?: string; // Error description on failure
  errorCode?: string; // Error code for programmatic handling
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

| Error Code                       | Description                       |
| -------------------------------- | --------------------------------- |
| `MODEL_FILE_EMPTY`               | Model file is empty               |
| `MODEL_UNSUPPORTED_FORMAT`       | Unsupported model format          |
| `MODEL_READ_FAILED`              | Model file read failed            |
| `MODEL_CONVERTER_UNAVAILABLE`    | .pth converter unavailable        |
| `MODEL_CONVERSION_FAILED`        | .pth -> ONNX conversion failed    |
| `MODEL_VERIFY_SESSION_FAILED`    | Model session verification failed |
| `MODEL_VERIFY_RUN_FAILED`        | Model verification run failed     |
| `MODEL_VERIFY_UNSUPPORTED_INPUT` | Model input format unsupported    |

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

| Error Code             | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `WORKER_TIMEOUT`       | Inference timeout                                             |
| `WORKER_UNKNOWN_ERROR` | Worker unknown error                                          |
| `WORKER_FETCH_FAILED`  | Failed to fetch the worker script (e.g. CORS / network error) |

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

### Hosting & Security Requirements

When loading the worker from a CDN or any origin other than your own page:

- **CORS**: the origin serving `inference.worker.js` must respond with
  `Access-Control-Allow-Origin: *` (or your page origin). jsDelivr and other
  public CDNs do this by default. Self-hosted static servers must enable CORS,
  otherwise `WORKER_FETCH_FAILED` is thrown when fetching the worker script.
- **CSP `worker-src`**: the worker is loaded via a same-origin `blob:` URL, so
  your `Content-Security-Policy` must allow it — e.g.
  `worker-src 'self' blob:;`. A restrictive `worker-src 'self'` will block the
  worker from starting.
- **CSP `connect-src`**: `fetch()` of the worker script and the WASM files must
  be permitted — include the CDN origin or use `connect-src 'self' https://cdn.jsdelivr.net;`.

---

## Example: Complete Inference Flow

```typescript
import { createRVC, runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";
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

  // 2. Create runtime context
  const rvc = createRVC();

  // 3. Prepare audio (decode + resample to 16kHz)
  const { audio: audioData, sampleRate } = await prepareInputAudio(audioFile);

  // 4. Run inference
  const ctx = await runPipelineInWorker(
    rvc,
    { model: modelFile, contentVec: contentVecFile, rmvpe: rmvpeFile },
    audioData,
    sampleRate,
    {
      onEvent: (event) => {
        if (event.type === "stage") {
          updateUI(event.stage);
        } else if (event.type === "chunk") {
          updateProgress(event.current, event.total);
        }
      },
    },
    { timeout: 600000 }, // 10 minute timeout (long songs)
  );

  // 5. Handle result
  if (ctx.state === "success" && ctx.outputWav) {
    return ctx.outputWav;
  }

  throw new Error(ctx.errorMessage || "Inference failed");
}
```

---

## WebGPU Compatibility Notes

**Current Status**: WebGPU has known issues with the RVC main model. ContentVec and RMVPE may work with WebGPU but are currently configured to use WASM.

### Known Issues

The WebGPU backend fails on the RVC main model with the error:

```
[WebGPU] Kernel "[Add] add_1015" failed. Error: Can't perform binary op on the given tensors
```

This occurs even though both inputs have identical shapes (`[1, 384, 4096]`), indicating a kernel bug in onnxruntime-web 1.24's WebGPU implementation rather than shape/type issues.

### Current Configuration

All models are currently configured to use WASM backend for consistency:

- **RVC Main Model**: Uses `createSessionFromOnnxBuffer()` with default `["wasm"]` backends
- **ContentVec**: Explicitly configured with `executionProviders: ["wasm"]`
- **RMVPE**: Explicitly configured with `executionProviders: ["wasm"]`

### Testing Status

- **RVC Main Model**: Confirmed to fail with WebGPU (kernel bug)
- **ContentVec**: Not tested with WebGPU (may work)
- **RMVPE**: Not tested with WebGPU (may work)

### Recommendations

1. Continue using WASM backend for all models (current default, stable configuration)
2. Wait for onnxruntime-web updates that may fix the WebGPU kernel bugs
3. Consider testing WebGPU for ContentVec and RMVPE separately if partial acceleration is desired

Currently, WASM + SIMD + multi-threading is recommended, which provides sufficient performance for most RVC scenarios.
