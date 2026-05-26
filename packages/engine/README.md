# RVC-Web-Runtime Engine

Browser-based RVC (Retrieval-based Voice Conversion) inference engine.

## Installation

```bash
npm install rvc-web-runtime
```

## Usage

```typescript
import { runPipeline } from "rvc-web-runtime";

// Load your model files
const modelFile = await fetch("path/to/model.onnx").then((r) => r.blob());
const contentVecFile = await fetch("path/to/vec-768-layer-12.onnx").then((r) => r.blob());
const rmvpeFile = await fetch("path/to/RMVPE.onnx").then((r) => r.blob());
const audioFile = await fetch("path/to/audio.wav").then((r) => r.blob());

// Run the pipeline
const result = await runPipeline(
  {
    model: new File([modelFile], "model.onnx"),
    contentVec: new File([contentVecFile], "vec-768-layer-12.onnx"),
    rmvpe: new File([rmvpeFile], "RMVPE.onnx"),
    audio: new File([audioFile], "audio.wav"),
  },
  {
    onEvent: (event) => {
      console.log("Pipeline event:", event);
    },
  },
  {
    speakerId: 0,
    pitchShift: 0,
    medianFilter: true,
    medianFilterWindow: 3,
  },
);

// Get the output audio
const wavBlob = new Blob([result.outputWav!], { type: "audio/wav" });
```

## API Documentation

See the main [API documentation](../../docs/api.md) for detailed API reference.

## Features

- **Full browser inference**: No server required
- **ONNX Runtime Web**: Uses WASM backend (WebGPU support planned)
- **Complete pipeline**: Feature extraction → Pitch estimation → Voice synthesis
- **F0 Median Filtering**: Pitch smoothing for better audio quality
- **Long audio support**: Automatic chunking and merging
- **TypeScript support**: Full type definitions included

## License

MIT
