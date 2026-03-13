export { readModelAsArrayBuffer, getModelFileExtension } from "./loader";
export { convertPthToOnnx } from "./pthToOnnx";
export { resolveModelToOnnxBuffer } from "./resolver";
export type { ModelMetaData, ConvertedPthModel, PreparedModel } from "./types";

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
