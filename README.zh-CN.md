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

```text
rvc-web-runtime/
├── packages/
│   ├── engine/                        # npm 包：核心推理引擎 (UI 无关)
│   │   └── src/
│   │       ├── pipeline/              # 任务调度与状态机
│   │       │   └── runPipeline.ts     # 主管道入口 (6 阶段)
│   │       ├── audio/                 # 音频预处理 (解码/重采样)
│   │       │   ├── decoder.ts         # 音频文件解码
│   │       │   ├── resampler.ts       # 采样率转换
│   │       │   ├── processor.ts       # 音频处理工具
│   │       │   ├── loader.ts          # 音频文件加载
│   │       │   └── types.ts           # 音频类型定义
│   │       ├── model/                 # 模型加载与 ONNX 会话管理
│   │       │   ├── sessionFactory.ts  # ONNX Runtime 会话创建
│   │       │   ├── pthToOnnx.ts       # PyTorch → ONNX 自动转换
│   │       │   ├── loader.ts          # 模型文件加载
│   │       │   ├── resolver.ts        # 模型路径解析
│   │       │   └── types.ts           # 模型类型定义
│   │       ├── feature/               # 阶段 A: ContentVec 内容特征提取
│   │       │   ├── index.ts           # 模块入口 (extractHubertFeatures)
│   │       │   ├── inference.ts       # 特征推理
│   │       │   ├── preprocess.ts      # ContentVec 音频预处理
│   │       │   ├── model.ts           # ContentVec 模型加载
│   │       │   └── types.ts           # 特征类型定义
│   │       ├── pitch/                 # 阶段 B: RMVPE 音高估计
│   │       │   ├── index.ts           # 模块入口 (estimatePitch)
│   │       │   ├── inference.ts       # 音高推理
│   │       │   ├── median-filter.ts   # F0 中值滤波 (音高平滑)
│   │       │   ├── model.ts           # RMVPE 模型加载
│   │       │   └── types.ts           # 音高类型定义
│   │       ├── synth/                 # 阶段 C: RVC 声学合成
│   │       │   ├── index.ts           # 模块入口 (synthesizeVoice)
│   │       │   ├── runner.ts          # ONNX 推理执行
│   │       │   ├── aligner.ts         # 特征-音高对齐
│   │       │   ├── builder.ts         # ONNX 图构建
│   │       │   ├── output.ts          # 输���后处理
│   │       │   └── types.ts           # 合成类型定义
│   │       ├── timbre/                # 声音音色管理
│   │       │   ├── index.ts           # 模块入口 (createVoiceTimbre)
│   │       │   └── types.ts           # 音色类型定义
│   │       ├── chunking/              # 长音频切片与镜像填充
│   │       │   ├── index.ts           # 模块入口 (分块工具)
│   │       │   └── types.ts           # 分块类型定义
│   │       ├── post/                  # 后处理 (WAV 编码)
│   │       │   ├── index.ts           # 模块入口 (encodeMonoPcmToWav)
│   │       │   ├── encoder.ts         # WAV 音频编码
│   │       │   └── types.ts           # 后处理类型定义
│   │       ├── worker/                # Web Worker 推理支持
│   │       │   ├── index.ts           # Worker 模块入口
│   │       │   ├── client.ts          # Worker 客户端接口
│   │       │   ├── inference.worker.ts # Worker 实现
│   │       │   └── types.ts           # Worker 类型定义
│   │       ├── errors/                # 错误处理
│   │       │   ├── errorCodes.ts      # 错误码常量
│   │       │   └── RvcError.ts        # 自定义错误类
│   │       └── types/                 # 共享 TypeScript 类型定义
│   │           ├── runtime.ts         # RuntimeContext 与 EngineState
│   │           └── pipeline.ts        # Pipeline API 契约
│   └── app/                           # 演示应用 (不发布)
│       └── src/
│           ├── main.ts                # 演示入口
│           └── styles/                # CSS 样式
├── docs/                              # API 文档
├── .github/                           # CI/CD 工作流
├── package.json                       # Monorepo 根配置 (npm workspaces)
└── tsconfig.json                      # 根 TypeScript 配置
```

## 🛠 技术栈

- **运行时**： [onnxruntime-web](https://github.com/microsoft/onnxruntime)
- **语言**：TypeScript
- **加速**：WebGPU / WebAssembly
- **构建工具**：Vite

## 🚀 使用方法

### 作为 npm 包使用

```bash
npm install rvc-web-runtime
```

```typescript
import { runPipeline } from "rvc-web-runtime";

// 详细用法请参考 API 文档
```

### 开发 / 演示

```bash
# 克隆仓库
git clone https://github.com/moyue23/rvc-web-runtime.git
cd rvc-web-runtime

# 安装依赖
npm install

# 运行演示应用
npm run dev
```

## 📖 API 文档

详见 [API 文档](./docs/api.zh-CN.md)。

## 🚧 状态：稳定测试版

RVC-Web-Runtime 目前处于 **稳定测试版** 阶段。核心功能完整且可用于生产环境，部分增强功能计划在后续版本中实现。

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

| 功能                | 状态                            |
| ------------------- | ------------------------------- |
| **音量包络融合**    | 🚧 计划中                       |
| **清辅音/呼吸保护** | 🚧 计划中                       |
| **F0 中值滤波**     | 🚧 计划中                       |
| **WebGPU 加速**     | 🚧 部分支持（RVC 主模型有问题） |

### ⚠️ 已知限制

- **音频长度**：超长音频（>5 分钟）可能导致内存问题（浏览器 WASM 限制约 4GB）
- **输出质量**：存在轻微杂音；特征检索尚未实现
- **输出采样率**：固定 48kHz（输入重采样为 16kHz）
- **模型兼容性**：仅支持 RVC v2 模型（768 维）
- **浏览器支持**：需要 WebAssembly SIMD；WebGPU 后端在 onnxruntime-web 1.24 中存在已知问题
- **WebGPU 支持**：RVC 主模型在 WebGPU 后端存在已知的内核错误。ContentVec 和 RMVPE 可能支持 WebGPU，但当前为保持一致性配置为使用 WASM。

### 📥 所需模型

运行 Pipeline 需要三个 ONNX 模型：

1. **ContentVec**（特征提取器）：`vec-768-layer-12.onnx`
   - 下载：[MoeSS-SUBModel/vec-768-layer-12.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx)

2. **RMVPE**（音高估计器）：`RMVPE.onnx`
   - 下载：[MoeSS-SUBModel/RMVPE.onnx](https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/RMVPE.onnx)

3. **RVC 模型**（合成器）：你训练的 `.onnx` 或 `.pth` 模型
   - `.pth` 格式会自动转换为 ONNX（使用 rvc-onnx-web）
   - 仅支持 RVC v2 模型
