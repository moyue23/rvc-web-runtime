import { convertPthToOnnx } from "./pthToOnnx";
import { getModelFileExtension, readModelAsArrayBuffer } from "./loader";

/**
 * Resolves a local model file to an ONNX buffer.
 */
export async function resolveModelToOnnxBuffer(model: File): Promise<ArrayBuffer> {
  const extension = getModelFileExtension(model.name);

  if (extension === ".onnx") {
    return readModelAsArrayBuffer(model);
  }

  if (extension === ".pth") {
    const result = await convertPthToOnnx(model);
    return result.onnxBuffer;
  }

  return readModelAsArrayBuffer(model);
}
