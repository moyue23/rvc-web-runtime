<div align="center">

<h1>RVC-Web-Runtime</h1>

[**English**](./README.md) | [**简体中文**](./README.zh-CN.md)

</div>

> **基于 RVC 的高性能、WebGPU 加速的人声音色转换推理引擎。100% 浏览器端运行。**

RVC-Web-Runtime 是一个专用执行引擎，致力于在浏览器中实现业界标准的 AI 歌声音色转换（RVC）。通过 **WebGPU** 与 **ONNX Runtime Web**，它在无需后端服务器的情况下实现声音推理。

## 🌟 核心优势

- **WebGPU 驱动的本地推理**：利用 `onnxruntime-web` 释放算力，实现 RVC 模型在浏览器端的全本地化推理，无服务器中转，确保数据隐私与零运行成本。

- **多态模型支持**：原生支持标准 `.onnx` 格式，并内置可选的 `.pth` 自动转换适配器，实现从训练环境到生产环境的无缝迁移。

- **端到端音频流水线**：集成从特征提取（HuBERT）、音高估计（RMVPE）到声学合成（Generator）的全流程，并针对长音频渲染优化了切片与混音逻辑。

## 🏗 架构

```
rvc-web-runtime/
├── src/
│ ├── engine/ # 核心推理引擎 (无 UI 依赖)
│ │ ├── pipeline/ # 任务调度与状态机
│ │ ├── audio/ # 音频预处理 (Decode/Resample)
│ │ ├── model/ # 模型解析与格式适配
│ │ ├── feature/ # HuBERT 特征提取工位
│ │ ├── pitch/ # RMVPE 音高估计工位
│ │ ├── synth/ # RVC 声学合成工位
│ │ ├── post/ # 后处理与导出 (Mix/Wav)
│ │ └── infra/ # 算力调度 (WebGPU/WASM 配置)
│ └── app/ # 演示应用 (Web Demo)
│ ├── main.ts # Demo 入口
│ └── ui/ # 交互组件
└── .github/ # CI/CD 自动化流水线
```

## 🛠 技术栈

- **运行时**： [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **语言**：TypeScript
- **加速**：WebGPU / WebAssembly
- **构建工具**：Vite

## 🚧 状态：施工中

项目处于早期 MVP 阶段，首个稳定版本即将发布，敬请期待。
