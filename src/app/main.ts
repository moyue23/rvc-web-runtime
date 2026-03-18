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

  const files: PipelineFiles = { model, audio, contentVec, rmvpe };
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
