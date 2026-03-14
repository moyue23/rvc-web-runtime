import type * as ort from "onnxruntime-web";

export interface SynthesisResult {
  audio: Float32Array;
  sampleRate?: number;
}

export interface SynthesisOptions {
  speakerId?: number;
  maxFrames?: number;
}

export interface SynthesisFeeds {
  phone: ort.Tensor;
  phone_lengths: ort.Tensor;
  pitch: ort.Tensor;
  nsff0: ort.Tensor;
  sid: ort.Tensor;
  [key: string]: ort.Tensor;
}
