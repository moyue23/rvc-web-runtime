import "./styles/main.css";
import { runPipeline, type PipelineFiles } from "../engine";

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
  const pthInput = byId<HTMLInputElement>("pth");
  const audioInput = byId<HTMLInputElement>("audio");

  const pth = pthInput.files?.[0];
  const audio = audioInput.files?.[0];

  if (!pth || !audio) {
    setText("status", "Please select both .pth and audio files.");
    return;
  }

  const files: PipelineFiles = { pth, audio };
  setText("status", "Running...");

  const ctx = await runPipeline(files, {
    onStateChange(state, progress) {
      setText("status", `${state} (${progress}%)`);
    },
  });

  if (ctx.state === "success" && ctx.outputWav) {
    createDownload(ctx.outputWav);
    setText("status", "Done.");
    return;
  }

  setText("status", `Failed: ${ctx.errorMessage ?? "Unknown error"}`);
}

byId<HTMLButtonElement>("run").addEventListener("click", () => {
  void onRun();
});
