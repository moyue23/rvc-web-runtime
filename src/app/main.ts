import "./styles/main.css";
import { prepareInputAudio } from "../engine/audio";
import { runPipelineInWorker } from "../engine/worker/client";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { EngineState } from "../engine/types/runtime/runtime";

/** Demo-only mapping: stage name → approximate progress for UI display. */
const STAGE_PROGRESS: Record<EngineState, number> = {
  idle: 0,
  input_preparation: 5,
  model_parsing: 15,
  feature_extraction: 25,
  pitch_estimation: 35,
  voice_synthesis: 40,
  post_processing: 95,
  success: 100,
  failed: 100,
};

const CONTENTVEC_URL =
  "https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/vec-768-layer-12.onnx";
const RMVPE_URL =
  "https://huggingface.co/NaruseMioShirakana/MoeSS-SUBModel/resolve/main/RMVPE.onnx";

interface ModelState {
  file: File | null;
  source: "download" | "upload" | null;
}

const autoModels: Record<string, ModelState> = {
  contentVec: { file: null, source: null },
  rmvpe: { file: null, source: null },
};

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}

function setText(id: string, text: string): void {
  byId<HTMLElement>(id).textContent = text;
}

function createDownload(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = byId<HTMLAnchorElement>("download");
  a.href = url;
  a.download = "cover.wav";
  a.style.display = "inline-block";
  a.textContent = "Download WAV";
}

async function fetchModelWithProgress(
  url: string,
  labelId: string,
  modelName: string,
): Promise<File | null> {
  const label = byId<HTMLLabelElement>(labelId);
  const originalText = label.getAttribute("data-original") ?? label.textContent ?? "";

  if (!url) {
    label.textContent = `${originalText} (未配置下载地址，请手动上传)`;
    return null;
  }

  try {
    label.textContent = `${originalText} — 正在下载...`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("No response body");
    }

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;

      if (total > 0) {
        const percent = ((received / total) * 100).toFixed(0);
        label.textContent = `${originalText} — 下载中 ${percent}%`;
      }
    }

    const blob = new Blob(chunks as unknown as BlobPart[]);
    const file = new File([blob], `${modelName}.onnx`, {
      type: "application/octet-stream",
    });
    label.textContent = `${originalText} — 已自动加载 (点击可上传覆盖)`;
    return file;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    label.textContent = `${originalText} — 下载失败: ${message} (请手动上传)`;
    return null;
  }
}

async function autoDownloadModels(): Promise<void> {
  const [contentVecFile, rmvpeFile] = await Promise.all([
    fetchModelWithProgress(CONTENTVEC_URL, "contentVec-label", "contentvec"),
    fetchModelWithProgress(RMVPE_URL, "rmvpe-label", "rmvpe"),
  ]);

  autoModels.contentVec = contentVecFile
    ? { file: contentVecFile, source: "download" }
    : { file: null, source: null };

  autoModels.rmvpe = rmvpeFile
    ? { file: rmvpeFile, source: "download" }
    : { file: null, source: null };
}

function getModelFile(inputId: "contentVec" | "rmvpe"): File | null {
  const input = byId<HTMLInputElement>(inputId);
  const uploaded = input.files?.[0];
  if (uploaded) return uploaded;
  return autoModels[inputId].file;
}

async function onRun(): Promise<void> {
  const modelInput = byId<HTMLInputElement>("model");
  const audioInput = byId<HTMLInputElement>("audio");

  const model = modelInput.files?.[0];
  const audio = audioInput.files?.[0];
  const contentVec = getModelFile("contentVec");
  const rmvpe = getModelFile("rmvpe");

  const missing: string[] = [];
  if (!model) missing.push("RVC Model");
  if (!audio) missing.push("Audio");
  if (!contentVec) missing.push("ContentVec");
  if (!rmvpe) missing.push("RMVPE");

  if (missing.length > 0) {
    setText("status", `Please select: ${missing.join(", ")}`);
    return;
  }

  setText("status", "Decoding audio...");
  const { audio: audioData, sampleRate: audioSampleRate } = await prepareInputAudio(audio!);

  const modelFiles = { model: model!, contentVec: contentVec!, rmvpe: rmvpe! };

  const speakerId = parseInt(byId<HTMLInputElement>("speakerId").value, 10) || 0;
  const pitchShift = parseInt(byId<HTMLInputElement>("pitchShift").value, 10) || 0;

  setText("status", "Running...");

  const startTime = performance.now();

  try {
    const ctx = await runPipelineInWorker(
      modelFiles,
      audioData,
      audioSampleRate,
      {
        onEvent(event) {
          if (event.type === "stage") {
            const progress = STAGE_PROGRESS[event.stage];
            setText("status", `${event.stage} (${progress}%)`);
          } else if (event.type === "chunk") {
            setText("status", `voice_synthesis — chunk ${event.current}/${event.total}`);
          }
        },
      },
      { speakerId, pitchShift },
    );

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    if (ctx.state === "success" && ctx.outputWav) {
      createDownload(ctx.outputWav);
      setText("status", `Done! (${duration}s)`);
      return;
    }

    setText("status", `Failed: ${ctx.errorMessage ?? "Unknown error"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setText("status", `Error: ${message}`);
  }
}

async function loadDocs(): Promise<void> {
  const docsContainer = byId<HTMLDivElement>("docs-content");
  try {
    const lang = navigator.language.toLowerCase();
    const docPath = lang.startsWith("zh") ? "/docs/api.zh-CN.md" : "/docs/api.md";
    const response = await fetch(docPath);
    if (!response.ok) {
      throw new Error(`Failed to load docs: ${response.status}`);
    }
    const markdown = await response.text();
    const html = await marked.parse(markdown);
    docsContainer.innerHTML = DOMPurify.sanitize(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    docsContainer.innerHTML = `<p style="color: red">Failed to load documentation: ${message}</p>`;
  }
}

function initNavigation(): void {
  const navLinks = document.querySelectorAll(".nav-link");
  const tabContents = document.querySelectorAll(".tab-content");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute("data-tab");
      if (!targetTab) return;

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
}

function setupPitchShiftSlider(): void {
  const slider = byId<HTMLInputElement>("pitchShift");
  const display = byId<HTMLSpanElement>("pitchShift-value");
  slider.addEventListener("input", () => {
    display.textContent = slider.value;
  });
}

function setupFileInputs(): void {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => {
    const fileInput = input as HTMLInputElement;
    const label = fileInput.previousElementSibling as HTMLLabelElement;
    if (!label) return;

    const originalText = label.textContent ?? "";
    label.setAttribute("data-original", originalText);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      const inputId = fileInput.id;

      if (file && (inputId === "contentVec" || inputId === "rmvpe")) {
        autoModels[inputId] = { file, source: "upload" };
        label.textContent = `${originalText} — 已上传: ${file.name}`;
      } else {
        label.textContent = file ? `${originalText}: ${file.name}` : originalText;
      }
    });
  });
}

initNavigation();
setupFileInputs();
setupPitchShiftSlider();
void loadDocs();
void autoDownloadModels();

byId<HTMLButtonElement>("run").addEventListener("click", () => {
  void onRun();
});
