# WebSVC Runtime (websvc-rt)
[English](./README.md) | [简体中文](./README.zh-CN.md)
> **基于 RVC 的高性能、WebGPU 加速的歌声音色转换（SVC）推理引擎。100% 浏览器端运行。**

WebSVC Runtime 是一个专用执行引擎，旨在将业界标准的 AI 歌声音色转换直接带到浏览器中。通过 **WebGPU** 与 **ONNX Runtime Web**，它在无需后端服务器的情况下实现高保真、低延迟的声音推理。

## 🌟 关键特性

- **WebGPU 加速**：利用最新的浏览器端 GPU 计算进行神经网络推理。
- **RVC 兼容**：专为 Retrieval-based Voice Conversion（RVC）架构（v1/v2）优化。
- **隐私优先**：所有音频处理都在用户设备本地完成，音频数据从不离开浏览器。
- **零服务器成本**：仅用静态文件托管即可扩展到百万级用户（GitHub Pages / Vercel）。
- **框架无关**：纯 TypeScript 实现，兼容 React、Vue、Svelte 或原生 JS。

## 🚀 为什么选择 WebSVC-RT？

现有的 Web 端声音工具往往需要复杂的后端搭建，或音质表现不佳。**WebSVC-RT** 通过以下能力改变现状：

- **直接加载 `.pth`**：无需在 PC 上预先转换模型。拖拽 RVC 权重文件，浏览器内即可完成处理。
- **录音棚级合成**：为完整歌曲渲染优化，采用高级切片与交叉渐变算法，在保持音质的同时避免内存崩溃。
- **端到端流水线**：从特征提取到最终混音，一体化完成，单库即成“录音棚”。

## 🏗 架构

项目采用模块化库结构：
- **核心引擎**：管理 ONNX 会话、WebGPU 内存与张量调度。
- **DSP 模块**：高性能音频重采样与 FFT 处理。
- **WASM Worker**：分担 F0（基频）估计等重 CPU 任务。

## 🛠 技术栈

- **运行时**： [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **语言**：TypeScript
- **加速**：WebGPU / WebAssembly
- **构建工具**：Vite

## 🚧 状态：施工中

项目处于早期 MVP 阶段，首个稳定版本即将发布，敬请期待。
