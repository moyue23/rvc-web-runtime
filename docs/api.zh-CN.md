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
    onStateChange: (state, progress) => {
      console.log(`${state}: ${progress}%`);
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

### PipelineCallbacks

流水线状态回调。

```typescript
type PipelineCallbacks = {
  onStateChange?: (state: EngineState, progress: number, context: RuntimeContext) => void;
};
```

| 回调            | 说明                                           |
| --------------- | ---------------------------------------------- |
| `onStateChange` | 状态或进度变化时触发，`progress` 范围 [0, 100] |

---

### WorkerClientOptions

Worker 客户端配置。

```typescript
interface WorkerClientOptions {
  timeout?: number; // 超时时间（毫秒），默认 300000（5分钟）
}
```

---

### RuntimeContext

运行时上下文，贯穿整个推理过程。

```typescript
interface RuntimeContext {
  // 状态与进度
  state: EngineState; // 当前阶段
  progress: number; // 进度百分比 [0, 100]

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
      onStateChange: (state, progress) => {
        updateUI(state, progress);
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

## WebGPU 兼容性说明（未来）

虽然当前版本仅支持 WASM 后端，但代码结构中保留了 WebGPU 支持接口。未来如果以下问题得到解决，可以重新启用 WebGPU：

1. ONNX Runtime Web 支持 INT64 数据类型转换
2. RVC 模型导出时避免使用动态形状广播
3. WebGPU 算子回退机制可靠
