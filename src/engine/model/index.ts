export { readModelAsArrayBuffer, getModelFileExtension } from "./loader";
export { convertPthToOnnx } from "./pthToOnnx";
export { resolveModelToOnnxBuffer } from "./resolver";

export type { SessionBackend, CreateSessionOptions, SessionFactoryResult } from "./sessionFactory";

import { getModelFileExtension, readModelAsArrayBuffer } from "./loader";
import { convertPthToOnnx } from "./pthToOnnx";

export async function prepareModel(file: File): Promise<{
  onnxBuffer: ArrayBuffer;
  metaData?: {
    sampleRate: number;
    version: string;
    useF0: boolean;
  };
}> {
  const extension = getModelFileExtension(file.name);

  if (extension === ".onnx") {
    const onnxBuffer = await readModelAsArrayBuffer(file);
    return { onnxBuffer };
  }

  return convertPthToOnnx(file);
}
