import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

/**
 * Decodes compressed audio bytes into AudioBuffer via Web Audio API.
 */
export async function decodeToAudioBuffer(buffer: ArrayBuffer): Promise<AudioBuffer> {
  if (buffer.byteLength === 0) {
    throw new RvcError(
      ErrorCodes.AUDIO_DECODE_FAILED,
      "Failed to decode audio: input buffer is empty.",
    );
  }

  const ctx = createAudioContext();

  try {
    return await ctx.decodeAudioData(buffer.slice(0));
  } catch (cause) {
    throw new RvcError(ErrorCodes.AUDIO_DECODE_FAILED, "Failed to decode audio data.", cause);
  } finally {
    try {
      await ctx.close();
    } catch {
      // Ignore close errors so decode result/error remains the source of truth.
    }
  }
}

type AudioContextCtor = new () => AudioContext;

function createAudioContext(): AudioContext {
  const g = globalThis as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };

  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) {
    throw new RvcError(
      ErrorCodes.AUDIO_DECODE_FAILED,
      "Failed to decode audio: AudioContext is not supported in this environment.",
    );
  }

  try {
    return new Ctor();
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.AUDIO_DECODE_FAILED,
      "Failed to initialize AudioContext for decoding.",
      cause,
    );
  }
}
