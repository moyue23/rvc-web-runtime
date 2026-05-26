import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/** Progress callback type. */
export type ModelLoadProgressCallback = (loaded: number, total: number) => void;

/**
 * Load ContentVec ONNX model from File or ArrayBuffer.
 */
export async function loadContentVecModel(
  source: File | ArrayBuffer,
  onProgress?: ModelLoadProgressCallback,
): Promise<ort.InferenceSession> {
  const arrayBuffer =
    source instanceof File ? await readFileWithProgress(source, onProgress) : source;

  return createSession(arrayBuffer);
}

async function createSession(arrayBuffer: ArrayBuffer): Promise<ort.InferenceSession> {
  try {
    const session = await ort.InferenceSession.create(arrayBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });

    return session;
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.FEATURE_MODEL_LOAD_FAILED,
      "Failed to create ContentVec ONNX session.",
      cause,
    );
  }
}

async function readFileWithProgress(
  file: File,
  onProgress?: ModelLoadProgressCallback,
): Promise<ArrayBuffer> {
  if (!onProgress) {
    return file.arrayBuffer();
  }

  // Manual progress tracking for FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };

    reader.onload = () => {
      onProgress(file.size, file.size);
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
