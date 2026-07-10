# RVC-Web-Runtime

Browser-based RVC (Retrieval-based Voice Conversion) inference engine powered by ONNX Runtime Web (WASM).

## Installation

```bash
npm install rvc-web-runtime
```

## Usage

```typescript
import {
  createRVC,
  runPipelineInWorker,
  prepareInputAudio,
  isWorkerSupported,
} from "rvc-web-runtime";

// Check browser support
if (!isWorkerSupported()) {
  throw new Error("Web Workers not supported");
}

// Create runtime context (zero-config: uses jsDelivr CDN)
const rvc = createRVC();
// Or self-hosted: createRVC({ assetBaseUrl: "https://your-cdn.com/rvc/" })

// Prepare audio (decode + resample to 16kHz)
const { audio: audioData, sampleRate } = await prepareInputAudio(audioFile);

// Run inference in a Web Worker
const result = await runPipelineInWorker(
  rvc,
  {
    model: modelFile, // .onnx or .pth file
    contentVec: hubertFile, // ContentVec ONNX model
    rmvpe: rmvpeFile, // RMVPE ONNX model
  },
  audioData,
  sampleRate,
  {
    onEvent: (event) => {
      if (event.type === "stage") {
        console.log(`Stage: ${event.stage}`);
      } else if (event.type === "chunk") {
        console.log(`Chunk ${event.current}/${event.total}`);
      }
    },
  },
  {
    timeout: 300000,
    pitchShift: 0,
    medianFilter: true,
  },
);

// Download result
if (result.outputWav) {
  const url = URL.createObjectURL(result.outputWav);
  const a = document.createElement("a");
  a.href = url;
  a.download = "output.wav";
  a.click();
}
```

## API Documentation

See the full [API documentation](https://github.com/moyue23/rvc-web-runtime/blob/main/docs/api.md) for detailed reference.

## Features

- **Full browser inference**: No server required
- **Web Worker execution**: Off main thread, non-blocking UI
- **ONNX Runtime Web**: WASM + SIMD + multi-threading backend
- **Complete pipeline**: Feature extraction → Pitch estimation → Voice synthesis
- **F0 median filtering**: Pitch smoothing for better audio quality
- **Long audio support**: Automatic chunking and crossfade merging
- **TypeScript**: Full type definitions included

## Browser Support

- **WASM SIMD**: Chrome 91+, Firefox 89+, Safari 16.4+
- **Multi-threading**: Requires COOP/COEP headers + SharedArrayBuffer
- **Web Workers**: All modern browsers

> **Note on cross-origin loading**: the worker is fetched via CORS and loaded
> through a same-origin Blob URL, so it can be hosted on any CDN that sends
> `Access-Control-Allow-Origin: *` (jsDelivr does by default). If your page uses
> a `Content-Security-Policy`, allow `worker-src 'self' blob:;` and add the CDN
> origin to `connect-src`. See the [API docs](https://github.com/moyue23/rvc-web-runtime/blob/main/docs/api.md) for details.

## License

MIT
