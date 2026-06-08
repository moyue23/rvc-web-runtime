<div align="center">

<h1>RVC-Web-Runtime</h1>

[**English**](./README.md) | [**简体中文**](./README.zh-CN.md)

</div>

> **The high-performance inference engine for Singing Voice Conversion (SVC) based on RVC. 100% browser-based.**

RVC-Web-Runtime is a specialized runtime engine focused on delivering industry-standard AI singing voice conversion (RVC) directly in the browser. Powered by **ONNX Runtime Web** (WASM backend, WebGPU support planned), it performs voice inference without any backend server.

## 🌟 Key Features

- **Local browser inference**: Uses `onnxruntime-web` (WASM) to fully run RVC models in-browser with no server relay, ensuring data privacy and zero runtime server cost. WebGPU acceleration planned.

- **Flexible model support**: Natively supports standard `.onnx` models and includes an optional `.pth` auto-conversion adapter for smooth migration from training to production.

- **End-to-end audio pipeline**: Integrates the full workflow from feature extraction (ContentVec) and pitch estimation (RMVPE) to acoustic synthesis (Generator), with slicing and mixing optimizations for long audio rendering.

## 🏗 Architecture

```text
rvc-web-runtime/
├── packages/
│   ├── engine/                        # npm package: Core inference engine (UI-agnostic)
│   │   └── src/
│   │       ├── pipeline/              # Task orchestration and state machine
│   │       │   └── runPipeline.ts     # Main pipeline entrypoint (6-stage)
│   │       ├── audio/                 # Audio preprocessing (Decode/Resample)
│   │       │   ├── decoder.ts         # Audio file decoding
│   │       │   ├── resampler.ts       # Sample rate conversion
│   │       │   ├── processor.ts       # Audio processing utilities
│   │       │   ├── loader.ts          # Audio file loading
│   │       │   └── types.ts           # Audio type definitions
│   │       ├── model/                 # Model loading and ONNX session management
│   │       │   ├── sessionFactory.ts  # ONNX Runtime session creation
│   │       │   ├── pthToOnnx.ts       # PyTorch → ONNX auto-conversion
│   │       │   ├── loader.ts          # Model file loading
│   │       │   ├── resolver.ts        # Model path resolution
│   │       │   └── types.ts           # Model type definitions
│   │       ├── feature/               # Stage A: ContentVec feature extraction
│   │       │   ├── index.ts           # Module entry (extractHubertFeatures)
│   │       │   ├── inference.ts       # Feature inference
│   │       │   ├── preprocess.ts      # Audio preprocessing for ContentVec
│   │       │   ├── model.ts           # ContentVec model loading
│   │       │   └── types.ts           # Feature type definitions
│   │       ├── pitch/                 # Stage B: RMVPE pitch estimation
│   │       │   ├── index.ts           # Module entry (estimatePitch)
│   │       │   ├── inference.ts       # Pitch inference
│   │       │   ├── median-filter.ts   # F0 median filtering (pitch smoothing)
│   │       │   ├── model.ts           # RMVPE model loading
│   │       │   └── types.ts           # Pitch type definitions
│   │       ├── synth/                 # Stage C: RVC acoustic synthesis
│   │       │   ├── index.ts           # Module entry (synthesizeVoice)
│   │       │   ├── runner.ts          # ONNX inference runner
│   │       │   ├── aligner.ts         # Feature-pitch alignment
│   │       │   ├── builder.ts         # ONNX graph construction
│   │       │   ├── output.ts          # Output post-processing
│   │       │   └── types.ts           # Synthesis type definitions
│   │       ├── timbre/                # Voice timbre management
│   │       │   ├── index.ts           # Module entry (createVoiceTimbre)
│   │       │   └── types.ts           # Timbre type definitions
│   │       ├── chunking/              # Long audio splitting with mirror padding
│   │       │   ├── index.ts           # Module entry (chunking utilities)
│   │       │   └── types.ts           # Chunking type definitions
│   │       ├── post/                  # Post-processing (WAV encoding)
│   │       │   ├── index.ts           # Module entry (encodeMonoPcmToWav)
│   │       │   ├── encoder.ts         # WAV audio encoding
│   │       │   └── types.ts           # Post type definitions
│   │       ├── worker/                # Web Worker inference support
│   │       │   ├── index.ts           # Worker module entry
│   │       │   ├── client.ts          # Worker client interface
│   │       │   ├── inference.worker.ts # Worker implementation
│   │       │   └── types.ts           # Worker type definitions
│   │       ├── errors/                # Error handling
│   │       │   ├── errorCodes.ts      # Error code constants
│   │       │   └── RvcError.ts        # Custom error class
│   │       └── types/                 # Shared TypeScript type definitions
│   │           ├── runtime.ts         # RuntimeContext and EngineState
│   │           └── pipeline.ts        # Pipeline API contracts
│   └── app/                           # Demo application (not published)
│       └── src/
│           ├── main.ts                # Demo entrypoint
│           └── styles/                # CSS styles
├── docs/                              # API documentation
├── .github/                           # CI/CD workflows
├── package.json                       # Monorepo root (npm workspaces)
└── tsconfig.json                      # Root TypeScript configuration
```

## 🛠 Tech Stack

- **Runtime**: [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **Language**: TypeScript
- **Acceleration**: WebGPU / WebAssembly
- **Build Tool**: Vite

## 🚀 Usage

### As an npm package

```bash
npm install rvc-web-runtime
```

```typescript
import { createRVC, runPipelineInWorker } from "rvc-web-runtime";

const rvc = createRVC(); // defaults to jsDelivr CDN
// Or: createRVC({ assetBaseUrl: "https://your-cdn.com/rvc/" })

// See API documentation for detailed usage
```

### Development / Demo

```bash
# Clone the repository
git clone https://github.com/moyue23/rvc-web-runtime.git
cd rvc-web-runtime

# Install dependencies
npm install

# Run the demo application
npm run dev
```

## 📖 API Documentation

See [API Documentation](./docs/api.md).

## 🚧 Status: Alpha

RVC-Web-Runtime is now in **Alpha** stage. It is functional for basic use cases but has known limitations.

### ✅ Completed

| Feature                           | Status      | Description                                                                  |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| **Pipeline Architecture**         | ✅ Stable   | 6-stage state machine (Input → Model → Feature → Pitch → Synthesis → Output) |
| **ContentVec Feature Extraction** | ✅ Working  | Layer 12, 768-dim features (RVC v2 compatible)                               |
| **RMVPE Pitch Estimation**        | ✅ Working  | 160Hz hop, direct waveform input                                             |
| **RVC Synthesis**                 | ✅ Working  | ONNX inference with feature + pitch fusion                                   |
| **Long Audio Support**            | ✅ Working  | 20s chunks with mirror padding, tested up to 4+ minutes                      |
| **Audio Chunking**                | ✅ Working  | Automatic merging for short final chunks (<10s)                              |
| **Model Format**                  | ✅ ONNX/PTH | `.onnx` supported, `.pth` auto-converted (via rvc-onnx-web)                  |

### 🔄 In Progress

| Feature               | Status         |
| --------------------- | -------------- |
| **Feature Retrieval** | 🚧 In Progress |

### 📋 Planned

| Feature                  | Status                                 |
| ------------------------ | -------------------------------------- |
| **Volume Envelope Mix**  | 🚧 Planned                             |
| **Voiceless Protection** | 🚧 Planned                             |
| **WebGPU Acceleration**  | 🚧 Partial (RVC main model has issues) |

### ✅ Recently Completed

| Feature                 | Status     | Description                                                                                                                             |
| ----------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **F0 Median Filtering** | ✅ Working | Pitch smoothing with standard (window=3) and aggressive (window=5) modes. Reduces pitch jitter and spikes for more stable vocal output. |

### ⚠️ Known Limitations

- **Audio Length**: Long audio (>5 min) may cause memory issues (browser WASM limit ~4GB)
- **Output Quality**: Minor artifacts present; Retrieval not yet implemented
- **Output Sample Rate**: Fixed at 48kHz (input resampled to 16kHz)
- **Model Compatibility**: Only RVC v2 models (768-dim) supported
- **Browser Support**: Requires WebAssembly with SIMD; WebGPU backend has known issues with onnxruntime-web 1.24
- **WebGPU Support**: RVC main model has known kernel bugs in WebGPU backend. ContentVec and RMVPE may work with WebGPU but are currently configured to use WASM for consistency.

### 📥 Required Models

You need three ONNX models to run the pipeline:

1. **ContentVec** (Feature Extractor): `vec-768-layer-12.onnx`
   - Download: [MoeSS-SUBModel/vec-768-layer-12.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx)

2. **RMVPE** (Pitch Estimator): `RMVPE.onnx`
   - Download: [MoeSS-SUBModel/RMVPE.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/RMVPE.onnx)

3. **RVC Model** (Synthesizer): Your trained `.onnx` or `.pth` model
   - `.pth` files are automatically converted to ONNX (via rvc-onnx-web)
   - Supports RVC v2 models only
