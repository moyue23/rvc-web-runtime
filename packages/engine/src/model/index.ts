export { createSessionFromOnnxBuffer } from "./sessionFactory";
export type { PreparedModel } from "./types";
export type { SessionBackend, CreateSessionOptions, SessionFactoryResult } from "./sessionFactory";

import { getModelFileExtension, readModelAsArrayBuffer } from "./loader";
import { convertPthToOnnx } from "./pthToOnnx";
import type { PreparedModel } from "./types";

export async function prepareModel(file: File): Promise<PreparedModel> {
  const extension = getModelFileExtension(file.name);

  if (extension === ".onnx") {
    const onnxBuffer = await readModelAsArrayBuffer(file);
    return { onnxBuffer };
  }

  return convertPthToOnnx(file);
}
