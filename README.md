<div align="center">

<h1>RVC-Web-Runtime</h1>

[**English**](./README.md) | [**简体中文**](./README.zh-CN.md)

</div>

> **The high-performance, WebGPU-accelerated inference engine for Singing Voice Conversion (SVC) based on RVC. 100% browser-based.**

RVC-Web-Runtime is a specialized runtime engine focused on delivering industry-standard AI singing voice conversion (RVC) directly in the browser. Powered by **WebGPU** and **ONNX Runtime Web**, it performs voice inference without any backend server.

## 🌟 Key Features

- **WebGPU-driven local inference**: Uses `onnxruntime-web` to fully run RVC models in-browser with no server relay, ensuring data privacy and zero runtime server cost.

- **Flexible model support**: Natively supports standard `.onnx` models and includes an optional `.pth` auto-conversion adapter for smooth migration from training to production.

- **End-to-end audio pipeline**: Integrates the full workflow from feature extraction (HuBERT) and pitch estimation (RMVPE) to acoustic synthesis (Generator), with slicing and mixing optimizations for long audio rendering.

## 🏗 Architecture

```text
rvc-web-runtime/
├── src/
│ ├── engine/                  # Core inference engine (UI-agnostic)
│ │ ├── pipeline/              # Task orchestration and state machine
│ │ ├── audio/                 # Audio preprocessing (Decode/Resample)
│ │ ├── model/                 # Model parsing and format adaptation
│ │ ├── feature/               # Stage A: ContentVec content feature extraction
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

## 🚧 Status: Under Construction

The project is currently in an early MVP stage. The first stable release is coming soon.
