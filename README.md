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
├── src/
│ ├── engine/                  # Core inference engine (UI-agnostic)
│ │ ├── pipeline/              # Task orchestration and state machine
│ │ ├── audio/                 # Audio preprocessing (Decode/Resample)
│ │ ├── model/                 # Model parsing and format adaptation
│ │ ├── feature/               # Stage A: ContentVec content feature extraction
│ │ ├── chunking/              # Long audio splitting with mirror padding
│ │ ├── retrieval/             # Optional: Feature retrieval (Index)
│ │ ├── pitch/                 # Stage B: RMVPE pitch estimation
│ │ ├── synth/                 # Stage C: RVC acoustic synthesis
│ │ ├── post/                  # Post-processing and export (Mix/Wav)
│ │ └── infra/                 # Compute backend scheduling (WebGPU/WASM)
│ └── app/                     # Demo application (Web Demo)
│   ├── main.ts                # Demo entry
│   └── ui/                    # UI components
└── .github/                   # CI/CD automation workflows
```

## 🛠 Tech Stack

- **Runtime**: [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **Language**: TypeScript
- **Acceleration**: WebGPU / WebAssembly
- **Build Tool**: Vite

## 🚧 Status: Alpha

RVC-Web-Runtime is now in **Alpha** stage. It is functional for basic use cases but has known limitations.

### ✅ Completed

| Feature | Status | Description |
|---------|--------|-------------|
| **Pipeline Architecture** | ✅ Stable | 6-stage state machine (Input → Model → Feature → Pitch → Synthesis → Output) |
| **ContentVec Feature Extraction** | ✅ Working | Layer 12, 768-dim features (RVC v2 compatible) |
| **RMVPE Pitch Estimation** | ✅ Working | 160Hz hop, direct waveform input |
| **RVC Synthesis** | ✅ Working | ONNX inference with feature + pitch fusion |
| **Long Audio Support** | ✅ Working | 20s chunks with mirror padding, tested up to 4+ minutes |
| **Audio Chunking** | ✅ Working | Automatic merging for short final chunks (<10s) |
| **Model Format** | ✅ ONNX/PTH | `.onnx` supported, `.pth` auto-converted (via rvc-onnx-web) |

### 🔄 In Progress / Planned

| Feature | Status | Description |
|---------|--------|-------------|
| **Feature Retrieval (faiss)** | 🚧 Planned | Index-based feature replacement for better timbre similarity |
| **WebGPU Acceleration** | 🚧 Planned | Currently WASM backend; WebGPU for faster inference |
| **Volume Envelope Matching** | 🚧 Planned | RMS mix rate for natural volume transitions |
| **UV (Unvoiced) Handling** | 🚧 Planned | Better handling of breath and silence |
| **Real-time Inference** | 🚧 Planned | Streaming mode for live voice conversion |

### ⚠️ Known Limitations

- **Audio Length**: Long audio (>5 min) may cause memory issues (browser WASM limit ~4GB)
- **Output Quality**: Minor artifacts present; Retrieval not yet implemented
- **Output Sample Rate**: Fixed at 48kHz (input resampled to 16kHz)
- **Model Compatibility**: Only RVC v2 models (768-dim) supported
- **Browser Support**: Requires WebAssembly with SIMD; WebGPU backend coming

### 📥 Required Models

You need three ONNX models to run the pipeline:

1. **ContentVec** (Feature Extractor): `vec-768-layer-12.onnx` (~378MB)
   - Download: [MoeSS-SUBModel/vec-768-layer-12.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx)

2. **RMVPE** (Pitch Estimator): `RMVPE.onnx` (~180MB)
   - Download: [MoeSS-SUBModel/RMVPE.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/RMVPE.onnx)

3. **RVC Model** (Synthesizer): Your trained `.onnx` or `.pth` model
   - `.pth` files are automatically converted to ONNX (via rvc-onnx-web)
   - Supports RVC v2 models only
