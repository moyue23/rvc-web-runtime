<div align="center">

<h1>RVC-Web-Runtime</h1>

[**English**](./README.md) | [**简体中文**](./README.zh-CN.md)

</div>

> **The high-performance, WebGPU-accelerated inference engine for Singing Voice Conversion (SVC) based on RVC. 100% browser-based.**

RVC-Web-Runtime is a specialized execution engine designed to bring industry-standard AI singing voice conversion directly to the web browser. By leveraging **WebGPU** and **ONNX Runtime Web**, it enables high-fidelity, low-latency voice inference without the need for a backend server.

## 🌟 Key Features

- **WebGPU Acceleration**: Utilizing the latest browser-based GPU compute for neural network inference.
- **RVC Compatibility**: Specifically optimized for Retrieval-based Voice Conversion (RVC) architectures (v1/v2).
- **Privacy First**: All audio processing happens locally on the user's device. No audio data ever leaves the browser.
- **Zero Server Cost**: Scale to millions of users with static file hosting (GitHub Pages/Vercel).
- **Framework Agnostic**: Pure TypeScript implementation, compatible with React, Vue, Svelte, or Vanilla JS.

## 🚀 Why RVC-Web-Runtime?

Existing web-based voice tools often require complex backend setups or offer poor audio quality. **RVC-Web-Runtime** changes this by providing:

- **Direct `.pth` Ingestion**: No need to pre-convert models on a PC. Drag and drop your RVC weights, and our engine handles the rest in-browser.
- **Studio-Quality Covers**: Optimized for full-song rendering with advanced slicing and crossfading algorithms to prevent memory crashes while maintaining fidelity.
- **End-to-End Pipeline**: From feature extraction to final mixing, it's a complete studio in a single library.

## 🏗 Architecture

The project is structured as a modular library:

- **Core Engine**: Manages ONNX sessions, WebGPU memory, and tensor scheduling.
- **DSP Module**: High-performance audio resampling and FFT processing.
- **WASM Worker**: Offloads heavy CPU tasks like F0 (pitch) estimation.

## 🛠 Tech Stack

- **Runtime**: [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **Language**: TypeScript
- **Acceleration**: WebGPU / WebAssembly
- **Build Tool**: Vite

## 🚧 Status: Under Construction

This project is currently in its early MVP stage. Stay tuned for the first stable release.
