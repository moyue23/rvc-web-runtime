import * as ort from 'onnxruntime-web/webgpu';

type ProgressStep = Readonly<{
  label: string;
  percent: number;
}>;

type ProgressUI = {
  setProgress: (step: ProgressStep) => void;
  setDone: (message: string) => void;
  setError: (message: string) => void;
};

const ORT_WASM_PATH = '/onnx-wasm/';
const INVALID_MODEL_PROBE_BYTES = new Uint8Array([0x08, 0x01, 0x12, 0x00]);
const LOG_PREFIX = '[webgpu-check]';
const PROBE_TIMEOUT_MS = 12000;

const STEPS: readonly ProgressStep[] = [
  { label: '初始化页面', percent: 5 },
  { label: '检测 WebGPU 支持', percent: 20 },
  { label: '请求 GPU 适配器', percent: 35 },
  { label: '初始化 ORT WebGPU 后端', percent: 70 },
  { label: '完成', percent: 100 },
];

function configureOrtRuntime(): void {
  ort.env.wasm.wasmPaths = ORT_WASM_PATH;
  (ort.env.wasm as { proxy?: boolean }).proxy = false;
  // Avoid worker/thread initialization stalls during bootstrap probing.
  ort.env.wasm.numThreads = 1;
}

function createProgressUI(): ProgressUI {
  const root = document.createElement('div');
  root.id = 'progress-root';
  root.style.cssText = `
    position: fixed;
    left: 16px;
    bottom: 16px;
    width: min(520px, calc(100vw - 32px));
    padding: 12px 14px;
    background: #0f1115;
    color: #e6e6e6;
    border: 1px solid #2a2f3a;
    border-radius: 10px;
    font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    z-index: 9999;
  `;

  const title = document.createElement('div');
  title.textContent = 'WebGPU 初始化进度';
  title.style.cssText = 'margin-bottom: 8px; font-weight: 600;';

  const status = document.createElement('div');
  status.textContent = '准备中...';
  status.style.cssText = 'margin-bottom: 8px; color: #b8c0d4;';

  const bar = document.createElement('div');
  bar.style.cssText = `
    height: 10px;
    background: #1f2430;
    border-radius: 999px;
    overflow: hidden;
  `;

  const fill = document.createElement('div');
  fill.style.cssText = `
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #3a7bd5, #00d2ff);
    transition: width 300ms ease;
  `;
  bar.appendChild(fill);

  root.append(title, status, bar);
  document.body.appendChild(root);

  const setFillPercent = (percent: number) => {
    const safePercent = Math.max(0, Math.min(100, percent));
    fill.style.width = `${safePercent}%`;
  };

  return {
    setProgress(step: ProgressStep) {
      status.textContent = step.label;
      setFillPercent(step.percent);
      fill.style.background = 'linear-gradient(90deg, #3a7bd5, #00d2ff)';
      status.style.color = '#b8c0d4';
    },
    setDone(message: string) {
      status.textContent = message;
      setFillPercent(100);
      fill.style.background = 'linear-gradient(90deg, #1fca7a, #4cd964)';
      status.style.color = '#d0f7e4';
    },
    setError(message: string) {
      status.textContent = `错误: ${message}`;
      setFillPercent(100);
      fill.style.background = 'linear-gradient(90deg, #ff6a6a, #ff9a3d)';
      status.style.color = '#ffd6d6';
    },
  };
}

function getWebGpu(): GPU {
  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is not available. Use the latest Chrome/Edge and ensure hardware acceleration is enabled.',
    );
  }
  return navigator.gpu;
}

async function requestGpuAdapter(gpu: GPU): Promise<GPUAdapter> {
  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new Error(
      'Failed to acquire a GPU adapter. Hardware acceleration may be disabled or unsupported on this device.',
    );
  }
  return adapter;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out (>${timeoutMs}ms)`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function preflightOrtAssets(): Promise<void> {
  const requiredFiles = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
  for (const file of requiredFiles) {
    const url = `${ORT_WASM_PATH}${file}`;
    const response = await withTimeout(fetch(url, { method: 'HEAD' }), 5000, `Asset probe ${file}`);
    if (!response.ok) {
      throw new Error(`ORT asset is not reachable: ${url} (${response.status})`);
    }
  }
}

async function probeOrtWebGpuBackend(): Promise<void> {
  await withTimeout(
    ort.InferenceSession.create(INVALID_MODEL_PROBE_BYTES, {
      executionProviders: ['webgpu'],
    }),
    PROBE_TIMEOUT_MS,
    'Initialize ORT WebGPU backend',
  );
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error');
}

function isExpectedInvalidModelError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('invalid') ||
    message.includes('no valid model') ||
    message.includes('model format') ||
    message.includes('protobuf')
  );
}

function getAdapterName(adapter: GPUAdapter): string {
  const info = adapter.info as Partial<GPUAdapterInfo> | undefined;
  return info?.description || 'Unknown GPU';
}

async function init(): Promise<void> {
  configureOrtRuntime();
  const ui = createProgressUI();
  ui.setProgress(STEPS[0]);
  console.log(`${LOG_PREFIX} starting runtime self-check`);

  try {
    console.log(
      `${LOG_PREFIX} runtime diagnostics`,
      JSON.stringify(
        {
          secureContext: window.isSecureContext,
          crossOriginIsolated: window.crossOriginIsolated,
          wasmPath: ORT_WASM_PATH,
          userAgent: navigator.userAgent,
        },
        null,
        2,
      ),
    );

    await preflightOrtAssets();

    ui.setProgress(STEPS[1]);
    const gpu = getWebGpu();
    console.log(`${LOG_PREFIX} WebGPU is available`);

    ui.setProgress(STEPS[2]);
    const adapter = await requestGpuAdapter(gpu);
    console.log(`${LOG_PREFIX} GPU adapter acquired:`, getAdapterName(adapter));

    ui.setProgress(STEPS[3]);
    console.log(`${LOG_PREFIX} probing ORT WebGPU backend`);
    await probeOrtWebGpuBackend();

    ui.setDone('ORT WebGPU 后端已完成初始化');
    console.log(`${LOG_PREFIX} ORT WebGPU backend initialized successfully`);
  } catch (error) {
    const normalizedError = normalizeError(error);
    console.warn(`${LOG_PREFIX} initialization feedback:`, normalizedError.message);

    if (isExpectedInvalidModelError(normalizedError)) {
      ui.setDone('ORT WebGPU 后端可用（探测模型无效属于预期结果）');
      console.log(`${LOG_PREFIX} probe succeeded: backend is available; invalid model bytes are expected`);
      return;
    }

    ui.setError(normalizedError.message);
    console.error(`${LOG_PREFIX} initialization failed`, normalizedError);
  }
}

void init();
