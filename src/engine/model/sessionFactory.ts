import * as ort from "onnxruntime-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

export type SessionBackend = "webgpu" | "wasm";

export interface CreateSessionOptions {
  preferredBackends?: readonly SessionBackend[];
  sessionOptions?: ort.InferenceSession.SessionOptions;
}

export interface SessionFactoryResult {
  session: ort.InferenceSession;
  backend: SessionBackend;
}

const DEFAULT_BACKENDS: readonly SessionBackend[] = ["webgpu", "wasm"];

export async function createSessionFromOnnxBuffer(
  onnxBuffer: ArrayBuffer,
  options: CreateSessionOptions = {},
): Promise<SessionFactoryResult> {
  const backends = normalizeBackends(options.preferredBackends);
  const sessionOptions = options.sessionOptions;
  let lastCause: unknown;

  for (const backend of backends) {
    try {
      const session = await ort.InferenceSession.create(onnxBuffer, {
        ...sessionOptions,
        executionProviders: [backend],
      });
      return { session, backend };
    } catch (cause) {
      lastCause = cause;
    }
  }

  throw new RvcError(
    ErrorCodes.MODEL_VERIFY_SESSION_FAILED,
    `Failed to create an ONNX Runtime session with backends: ${backends.join(", ")}.`,
    lastCause,
  );
}

function normalizeBackends(backends?: readonly SessionBackend[]): readonly SessionBackend[] {
  if (!backends || backends.length === 0) {
    return DEFAULT_BACKENDS;
  }

  const unique = new Set<SessionBackend>(backends);
  return Array.from(unique);
}
