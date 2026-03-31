import "./styles/main.css";
import { prepareInputAudio } from "../engine/audio";
import { runPipelineInWorker } from "../engine/worker/client";
import { marked } from "marked";
import DOMPurify from "dompurify";

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

async function onRun(): Promise<void> {
  const modelInput = byId<HTMLInputElement>("model");
  const audioInput = byId<HTMLInputElement>("audio");
  const contentVecInput = byId<HTMLInputElement>("contentVec");
  const rmvpeInput = byId<HTMLInputElement>("rmvpe");

  const model = modelInput.files?.[0];
  const audio = audioInput.files?.[0];
  const contentVec = contentVecInput.files?.[0];
  const rmvpe = rmvpeInput.files?.[0];

  if (!model || !audio || !contentVec || !rmvpe) {
    setText("status", "Please select all required files (model, audio, ContentVec, RMVPE).");
    return;
  }

  setText("status", "Decoding audio...");
  const { audio: audioData, sampleRate: audioSampleRate } = await prepareInputAudio(audio);

  const modelFiles = { model, contentVec, rmvpe };
  setText("status", "Running...");

  const startTime = performance.now();

  try {
    const ctx = await runPipelineInWorker(modelFiles, audioData, audioSampleRate, {
      onStateChange(state, progress) {
        setText("status", `${state} (${progress}%)`);
      },
    });

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

function setupFileInputs(): void {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => {
    const fileInput = input as HTMLInputElement;
    const label = fileInput.previousElementSibling as HTMLLabelElement;
    if (!label) return;

    const originalText = label.textContent ?? "";

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      label.textContent = file ? `${originalText}: ${file.name}` : originalText;
    });
  });
}

initNavigation();
setupFileInputs();
void loadDocs();

byId<HTMLButtonElement>("run").addEventListener("click", () => {
  void onRun();
});
