<div align="center">

<h1>RVC-Web-Runtime</h1>

[**English**](./README.md) | [**简体中文**](./README.zh-CN.md)

</div>

> **基于 RVC 的高性能人声音色转换推理引擎。100% 浏览器端运行。**

RVC-Web-Runtime 是一个专用执行引擎，致力于在浏览器中实现业界标准的 AI 歌声音色转换（RVC）。通过 **ONNX Runtime Web** (WASM 后端，WebGPU 支持计划中)，它在无需后端服务器的情况下实现声音推理。

## 🌟 核心优势

- **本地浏览器推理**：利用 `onnxruntime-web` (WASM) 实现 RVC 模型在浏览器端的全本地化推理，无服务器中转，确保数据隐私与零运行成本。WebGPU 加速计划中。

- **多态模型支持**：原生支持标准 `.onnx` 格式，并内置可选的 `.pth` 自动转换适配器，实现从训练环境到生产环境的无缝迁移。

- **端到端音频流水线**：集成从特征提取（ContentVec）、音高估计（RMVPE）到声学合成（Generator）的全流程，并针对长音频渲染优化了切片与混音逻辑。

## 🏗 架构

```
rvc-web-runtime/
├── src/
│ ├── engine/                  # 核心推理引擎 (无 UI 依赖)
│ │ ├── pipeline/              # 任务调度与状态机
│ │ ├── audio/                 # 音频预处理 (Decode/Resample)
│ │ ├── model/                 # 模型解析与格式适配
│ │ ├── feature/               # Stage A: ContentVec 内容特征提取
│ │ ├── chunking/              # 长音频分块与拼接（镜像填充）
│ │ ├── retrieval/             # (可选) 特征检索
│ │ ├── pitch/                 # Stage B: RMVPE 音高估计
│ │ ├── synth/                 # Stage C: RVC 声学合成
│ │ ├── post/                  # 后处理与导出 (Mix/Wav)
│ │ └── infra/                 # 算力调度 (WebGPU/WASM 配置)
│ └── app/                     # 演示应用 (Web Demo)
│   ├── main.ts                # Demo 入口
│   └── ui/                    # 交互组件
└── .github/                   # CI/CD 自动化流水线
```

## 🛠 技术栈

- **运行时**： [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **语言**：TypeScript
- **加速**：WebGPU / WebAssembly
- **构建工具**：Vite

## 🚀 使用方法

```bash
npm rvc-web
```

## 📖 API 文档

详见 [API 文档](./docs/api.zh-CN.md)。

## 🚧 状态：Alpha 测试版

RVC-Web-Runtime 目前处于 **Alpha** 阶段。基本功能可用，但存在一些已知限制。

### ✅ 已完成

| 功能                    | 状态        | 说明                                                    |
| ----------------------- | ----------- | ------------------------------------------------------- |
| **Pipeline 架构**       | ✅ 稳定     | 6 阶段状态机（输入 → 模型 → 特征 → 音高 → 合成 → 输出） |
| **ContentVec 特征提取** | ✅ 可用     | Layer 12，768 维特征（兼容 RVC v2）                     |
| **RMVPE 音高估计**      | ✅ 可用     | 160Hz hop，直接波形输入                                 |
| **RVC 语音合成**        | ✅ 可用     | ONNX 推理，特征与音高融合                               |
| **长音频支持**          | ✅ 可用     | 20 秒分块 + 镜像填充，已测试 4 分钟以上音频             |
| **音频分块**            | ✅ 可用     | 自动合并末尾短音频（<10 秒）                            |
| **模型格式**            | ✅ ONNX/PTH | 支持 `.onnx` 模型，`.pth` 自动转换                      |

### 🔄 开发中

| 功能                 | 状态      |
| -------------------- | --------- |
| **特征检索 (Index)** | 🚧 开发中 |

### 📋 计划中

| 功能                | 状态      |
| ------------------- | --------- |
| **音量包络融合**    | 🚧 计划中 |
| **清辅音/呼吸保护** | 🚧 计划中 |
| **F0 中值滤波**     | 🚧 计划中 |
| **WebGPU 加速**     | 🚧 计划中 |

### ⚠️ 已知限制

- **音频长度**：超长音频（>5 分钟）可能导致内存问题（浏览器 WASM 限制约 4GB）
- **输出质量**：存在轻微杂音；特征检索尚未实现
- **输出采样率**：固定 48kHz（输入重采样为 16kHz）
- **模型兼容性**：仅支持 RVC v2 模型（768 维）
- **浏览器支持**：需要 WebAssembly SIMD；WebGPU 后端开发中

### 📥 所需模型

运行 Pipeline 需要三个 ONNX 模型：

1. **ContentVec**（特征提取器）：`vec-768-layer-12.onnx`
   - 下载：[MoeSS-SUBModel/vec-768-layer-12.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx)

2. **RMVPE**（音高估计器）：`RMVPE.onnx`
   - 下载：[MoeSS-SUBModel/RMVPE.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/RMVPE.onnx)

3. **RVC 模型**（合成器）：你训练的 `.onnx` 或 `.pth` 模型
   - `.pth` 格式会自动转换为 ONNX（使用 rvc-onnx-web）
   - 仅支持 RVC v2 模型
