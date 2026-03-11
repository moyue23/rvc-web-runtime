import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

const SUPPORTED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/wav", "audio/wave", "audio/x-wav"]);
const SUPPORTED_AUDIO_EXTENSIONS = new Set([".mp3", ".wav"]);

/**
 * Reads local audio file into ArrayBuffer with basic input checks.
 */
export async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  validateAudioFile(file);

  try {
    return await file.arrayBuffer();
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.FILE_READ_FAILED,
      `Failed to read audio file "${file.name}".`,
      cause,
    );
  }
}

function validateAudioFile(file: File): void {
  if (file.size === 0) {
    throw new RvcError(ErrorCodes.FILE_EMPTY, `The audio file "${file.name}" is empty.`);
  }

  const mime = file.type.toLowerCase();
  const extension = getFileExtension(file.name);
  const mimeAllowed = mime.length > 0 && SUPPORTED_AUDIO_TYPES.has(mime);
  const extensionAllowed = SUPPORTED_AUDIO_EXTENSIONS.has(extension);

  if (!mimeAllowed && !extensionAllowed) {
    throw new RvcError(
      ErrorCodes.INVALID_TYPE,
      `Unsupported audio file "${file.name}". Only mp3/wav are allowed.`,
    );
  }
}

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }

  return name.slice(dot).toLowerCase();
}
