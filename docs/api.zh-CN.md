# RVC-Web-Runtime API 文档

RVC-Web-Runtime 是一个基于 **WASM** 的 **Retrieval-based Voice Conversion (RVC)** 推理引擎，完全在浏览器端运行。

> **注意**：本项目目前仅支持 WASM 后端。WebGPU 后端由于模型内部使用 INT64 数据类型和动态形状广播限制，暂时无法使用。

---

## 快速开始

```typescript
import { runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";

// 检查 Worker 支持
if (!isWorkerSupported()) {
  alert("浏览器不支持 Web Workers");
}

// 运行推理
const result = await runPipelineInWorker(
  {
    model: modelFile, // .onnx 或 .pth 文件
    contentVec: hubertFile, // ContentVec ONNX 模型
    rmvpe: rmvpeFile, // RMVPE ONNX 模型
  },
  audioData, // Float32Array，必须 16kHz
  16000, // 采样率
  {
    onEvent: (event) => {
      if (event.type === "stage") {
        console.log(`阶段: ${event.stage}`);
      } else if (event.type === "chunk") {
        console.log(`分段 ${event.current}/${event.total}`);
      }
    },
  },
  { timeout: 300000 }, // 可选：5分钟超时
);

// 下载结果
if (result.outputWav) {
  const url = URL.createObjectURL(result.outputWav);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cover.wav";
  a.click();
}
```

---

## API 参考

### runPipelineInWorker()

在主线程外的 Web Worker 中运行完整的 RVC 推理流水线。

**函数签名**

```typescript
async function runPipelineInWorker(
  files: Omit<PipelineFiles, "audio">,
  audioData: Float32Array,
  audioSampleRate: number,
  callbacks?: PipelineCallbacks,
  options?: WorkerClientOptions,
): Promise<RuntimeContext>;
```

**参数**

| 参数              | 类型                           | 说明                         |
| ----------------- | ------------------------------ | ---------------------------- |
| `files`           | `Omit<PipelineFiles, "audio">` | 模型文件对象（不含音频）     |
| `audioData`       | `Float32Array`                 | 已解码的单声道 PCM 数据      |
| `audioSampleRate` | `number`                       | 音频采样率，**必须为 16000** |
| `callbacks`       | `PipelineCallbacks`            | 可选回调函数                 |
| `options`         | `WorkerClientOptions`          | 可选配置                     |

**返回值**

`Promise<RuntimeContext>` - 包含完整推理结果的上下文对象

---

### PipelineFiles

推理所需的模型文件。

```typescript
type PipelineFiles = {
  model: File; // RVC 模型：.onnx 或 .pth 格式
  audio: File; // 源音频：.mp3, .wav 等
  contentVec: File; // ContentVec/HuBERT 特征提取模型（ONNX）
  rmvpe: File; // RMVPE 音高估计模型（ONNX）
  index?: File; // （可选）特征索引文件
};
```

**注意**：`runPipelineInWorker()` 接受 `Omit<PipelineFiles, "audio">`，音频数据通过 `audioData` 参数传入。

---

### PipelineEvent

流水线发出的事件。

```typescript
type PipelineEvent =
  | { type: "stage"; stage: EngineState } // 进入新阶段
  | { type: "chunk"; current: number; total: number }; // 分段处理完成
```

| 事件类型 | 字段                 | 说明                          |
| -------- | -------------------- | ----------------------------- |
| `stage`  | `stage: EngineState` | 流水线进入新阶段              |
| `chunk`  | `current`, `total`   | 第 `current` / `total` 段完成 |

---

### PipelineCallbacks

流水线事件回调。

```typescript
type PipelineCallbacks = {
  onEvent?: (event: PipelineEvent) => void;
};
```

| 回调      | 说明                           |
| --------- | ------------------------------ |
| `onEvent` | 流水线阶段变化或分段完成时触发 |

---

### WorkerClientOptions

Worker 客户端配置。

```typescript
interface WorkerClientOptions {
  timeout?: number; // 超时时间（毫秒），默认 300000（5分钟）
  speakerId?: number; // 多说话人模型的说话人 ID，默认 0
  pitchShift?: number; // 音高偏移（半音），默认 0
  medianFilter?: boolean; // 启用 F0 中值滤波进行音高平滑，默认 true
  medianFilterWindow?: number; // 中值滤波窗口大小（必须为奇数），默认 3
  aggressiveMedianFilter?: boolean; // 使用激进中值滤波（更强的平滑效果），默认 false
  chunkDuration?: number; // 分块时长（秒），默认 20
  padDuration?: number; // 填充时长（秒），默认 0.5
  inputSampleRate?: number; // 输入采样率，默认 16000
  outputSampleRate?: number; // 输出采样率，默认 48000
}
```

### F0 中值滤波

F0 中值滤波是一种音高平滑技术，用于减少估计音高曲线中的抖动和尖峰。此功能特别适用于：

- **稳定不稳定的音高**：减少业余歌唱或情感化说话中的音高抖动
- **去除音高峰值**：过滤导致伪音的孤立音高跳变
- **提高整体平滑度**：创建更自然的音高过渡

**提供两种滤波模式：**

1. **标准模式** (`medianFilter: true`)：
   - 窗口大小：3（默认，可通过 `medianFilterWindow` 调整）
   - 适用于大多数情况的轻度平滑
   - 对自然音高变化影响最小

2. **激进模式** (`aggressiveMedianFilter: true`)：
   - 窗口大小：5（默认，可通过 `medianFilterWindow` 调整）
   - 针对问题音频的更强平滑
   - 更有效地去除显著音高峰值

**调试输出**：启用时，滤波器会将统计信息记录到控制台：

- 改变的帧数
- 受影响帧的百分比
- 总频率变化量和平均变化量
- 最大变化及其位置

**使用示例**：

```typescript
const result = await runPipelineInWorker(files, audioData, 16000, callbacks, {
  medianFilter: true, // 启用音高平滑
  medianFilterWindow: 5, // 使用更大的窗口进行更强平滑
  aggressiveMedianFilter: false, // 使用标准模式
});
```

---

### RuntimeContext

运行时上下文，贯穿整个推理过程。

```typescript
interface RuntimeContext {
  // 状态
  state: EngineState; // 当前阶段

  // 输入数据
  inputAudio?: Float32Array; // 解码后的源音频
  sampleRate?: number; // 采样率（通常为 16000）

  // 模型相关
  onnxBuffer?: ArrayBuffer; // ONNX 模型字节
  modelMetaData?: RuntimeModelMetaData; // 模型元数据
  modelSession?: ort.InferenceSession; // ONNX Runtime 会话

  // 中间结果
  hiddenStates?: Float32Array; // Stage A: HuBERT 特征
  f0?: Float32Array; // Stage B: 音高序列

  // 输出结果
  outputAudio?: Float32Array; // Stage C: 合成音频
  outputWav?: Blob; // 最终 WAV 文件

  // 错误信息
  errorMessage?: string; // 失败时的错误描述
}
```

---

### EngineState

流水线阶段枚举。

| 状态                 | 说明                            |
| -------------------- | ------------------------------- |
| `idle`               | 空闲状态，等待输入              |
| `input_preparation`  | 解码源音频                      |
| `model_parsing`      | 加载模型（或转换 .pth -> ONNX） |
| `feature_extraction` | Stage A: 提取 HuBERT 特征       |
| `pitch_estimation`   | Stage B: RMVPE 音高估计         |
| `voice_synthesis`    | Stage C: ONNX 推理合成          |
| `post_processing`    | 后处理（混音、WAV 编码）        |
| `success`            | 推理成功完成                    |
| `failed`             | 推理失败                        |

---

### isWorkerSupported()

检查当前浏览器是否支持 Web Workers。

```typescript
function isWorkerSupported(): boolean;
```

---

## 错误码

所有错误通过 `RvcError` 抛出，包含 `code` 和 `message`。

### 音频相关

| 错误码                        | 说明             |
| ----------------------------- | ---------------- |
| `AUDIO_FILE_EMPTY`            | 音频文件为空     |
| `AUDIO_INVALID_TYPE`          | 不支持的音频格式 |
| `AUDIO_FILE_READ_FAILED`      | 文件读取失败     |
| `AUDIO_DECODE_FAILED`         | 音频解码失败     |
| `AUDIO_RESAMPLE_INVALID_RATE` | 重采样参数无效   |

### 模型相关

| 错误码                        | 说明                  |
| ----------------------------- | --------------------- |
| `MODEL_FILE_EMPTY`            | 模型文件为空          |
| `MODEL_UNSUPPORTED_FORMAT`    | 不支持的模型格式      |
| `MODEL_READ_FAILED`           | 模型文件读取失败      |
| `MODEL_CONVERTER_UNAVAILABLE` | .pth 转换器不可用     |
| `MODEL_CONVERSION_FAILED`     | .pth -> ONNX 转换失败 |
| `MODEL_VERIFY_SESSION_FAILED` | 模型会话验证失败      |

### 特征提取相关

| 错误码                      | 说明                    |
| --------------------------- | ----------------------- |
| `FEATURE_MODEL_LOAD_FAILED` | ContentVec 模型加载失败 |
| `FEATURE_PREPROCESS_FAILED` | 音频预处理失败          |
| `FEATURE_INFERENCE_FAILED`  | 特征推理失败            |
| `FEATURE_INVALID_AUDIO`     | 音频数据无效            |

### 音高估计相关

| 错误码                    | 说明               |
| ------------------------- | ------------------ |
| `PITCH_MODEL_LOAD_FAILED` | RMVPE 模型加载失败 |
| `PITCH_INFERENCE_FAILED`  | 音高推理失败       |

### 语音合成相关

| 错误码                      | 说明             |
| --------------------------- | ---------------- |
| `SYNTH_FEED_BUILD_FAILED`   | 模型输入构建失败 |
| `SYNTH_INFERENCE_FAILED`    | ONNX 推理失败    |
| `SYNTH_OUTPUT_PARSE_FAILED` | 输出解析失败     |

### Worker 相关

| 错误码                 | 说明            |
| ---------------------- | --------------- |
| `WORKER_TIMEOUT`       | 推理超时        |
| `WORKER_UNKNOWN_ERROR` | Worker 未知错误 |

---

## 重要限制

### 采样率要求

**ContentVec/HuBERT 模型严格要求 16kHz 输入**。其他采样率会导致特征提取失败或输出异常。

### 音频长度

长音频会自动分块处理以防止内存溢出（OOM）。分块在 pipeline 层处理，确保特征提取和音高估计的帧对齐。

### 浏览器支持

- **WASM SIMD**: Chrome 91+, Firefox 89+, Safari 16.4+
- **WASM 多线程**: 需要 COOP/COEP 响应头 + SharedArrayBuffer
- **Web Workers**: 所有现代浏览器

---

## 示例：完整推理流程

```typescript
import { runPipelineInWorker, isWorkerSupported } from "rvc-web-runtime";
import { prepareInputAudio } from "rvc-web-runtime/audio";

async function convertVoice(
  modelFile: File,
  audioFile: File,
  contentVecFile: File,
  rmvpeFile: File,
) {
  // 1. 检查支持
  if (!isWorkerSupported()) {
    throw new Error("浏览器不支持 Web Workers");
  }

  // 2. 准备音频（解码 + 重采样到 16kHz）
  const { audio: audioData, sampleRate } = await prepareInputAudio(audioFile);

  // 3. 运行推理
  const ctx = await runPipelineInWorker(
    { model: modelFile, contentVec: contentVecFile, rmvpe: rmvpeFile },
    audioData,
    sampleRate,
    {
      onEvent: (event) => {
        if (event.type === "stage") {
          updateUI(event.stage);
        } else if (event.type === "chunk") {
          updateProgress(event.current, event.total);
        }
      },
    },
    { timeout: 600000 }, // 10分钟超时（长歌曲）
  );

  // 4. 处理结果
  if (ctx.state === "success" && ctx.outputWav) {
    return ctx.outputWav;
  }

  throw new Error(ctx.errorMessage || "推理失败");
}
```

---

## WebGPU 兼容性说明

**当前状态**：WebGPU 在 RVC 主模型上存在已知问题。ContentVec 和 RMVPE 可能支持 WebGPU，但当前配置为使用 WASM。

### 已知问题

WebGPU 后端在 RVC 主模型上失败，错误信息为：

```
[WebGPU] Kernel "[Add] add_1015" failed. Error: Can't perform binary op on the given tensors
```

即使两个输入具有完全相同的形状（`[1, 384, 4096]`），仍然会出现此错误，这表明是 onnxruntime-web 1.24 的 WebGPU 实现存在内核错误，而不是形状或类型问题。

### 当前配置

所有模型当前均配置为使用 WASM 后端以保持一致性：

- **RVC 主模型**：使用 `createSessionFromOnnxBuffer()`，默认后端为 `["wasm"]`
- **ContentVec**：明确配置为 `executionProviders: ["wasm"]`
- **RMVPE**：明确配置为 `executionProviders: ["wasm"]`

### 测试状态

- **RVC 主模型**：已确认在 WebGPU 上失败（内核错误）
- **ContentVec**：未在 WebGPU 上测试（可能可用）
- **RMVPE**：未在 WebGPU 上测试（可能可用）

### 建议

1. 继续为所有模型使用 WASM 后端（当前默认配置，稳定）
2. 等待 onnxruntime-web 更新以修复 WebGPU 内核错误
3. 如果需要部分加速，可考虑单独测试 ContentVec 和 RMVPE 的 WebGPU 支持

目前推荐使用 WASM + SIMD + 多线程，这为大多数 RVC 场景提供了足够的性能。
