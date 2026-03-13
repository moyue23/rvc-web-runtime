import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

const SUPPORTED_MODEL_EXTENSIONS = new Set([".onnx", ".pth"]);

/**
 * Reads a local model file into ArrayBuffer with basic input checks.
 */
export async function readModelAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  validateModelFile(file);

  try {
    return await file.arrayBuffer();
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.MODEL_READ_FAILED,
      `Failed to read model file "${file.name}".`,
      cause,
    );
  }
}

export function getModelFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }

  return name.slice(dot).toLowerCase();
}

function validateModelFile(file: File): void {
  if (file.size === 0) {
    throw new RvcError(ErrorCodes.MODEL_FILE_EMPTY, `The model file "${file.name}" is empty.`);
  }

  const extension = getModelFileExtension(file.name);
  if (!SUPPORTED_MODEL_EXTENSIONS.has(extension)) {
    throw new RvcError(
      ErrorCodes.MODEL_UNSUPPORTED_FORMAT,
      `Unsupported model file "${file.name}". Only .onnx or .pth are allowed.`,
    );
  }
}
