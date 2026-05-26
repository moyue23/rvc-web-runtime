import type * as ort from "onnxruntime-web";
import type { SessionBackend } from "../model/sessionFactory";
import type { ModelMetaData } from "../model/types";

export interface CreateTimbreOptions {
  model: File;
  name?: string;
  speakerId?: number;
  preferredBackends?: SessionBackend[];
}

export interface Timbre {
  id: string;
  name: string;
  speakerId: number;
  modelMetaData: ModelMetaData;
  onnxBuffer: ArrayBuffer;
  session: ort.InferenceSession;
  backend: SessionBackend;
}
