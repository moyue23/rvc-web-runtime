export type { CreateTimbreOptions, Timbre } from "./types";

import { prepareModel, createSessionFromOnnxBuffer } from "../model";
import type { CreateTimbreOptions, Timbre } from "./types";

export async function createVoiceTimbre(options: CreateTimbreOptions): Promise<Timbre> {
  const { model, name, speakerId = 0, preferredBackends } = options;

  const { onnxBuffer, metaData } = await prepareModel(model);
  const { session, backend } = await createSessionFromOnnxBuffer(onnxBuffer, { preferredBackends });

  return {
    id: generateId(),
    name: name ?? sanitizeName(model.name),
    speakerId,
    modelMetaData: metaData ?? { sampleRate: 40000, version: "unknown", useF0: false },
    onnxBuffer,
    session,
    backend,
  };
}

function sanitizeName(fileName: string): string {
  return fileName.replace(/\.(pth|onnx)$/i, "").replace(/[^a-zA-Z0-9一-鿿_-]/g, "_");
}

function generateId(): string {
  return `timbre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
