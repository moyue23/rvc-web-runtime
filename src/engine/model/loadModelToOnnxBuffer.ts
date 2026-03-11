import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

type PthToOnnxResult = {
  onnxBuffer: Uint8Array | ArrayBuffer;
};

type PthToOnnxFn = (input: File, options?: { opsetVersion?: number }) => Promise<PthToOnnxResult>;

export async function loadModelToOnnxBuffer(model: File): Promise<ArrayBuffer> {
  const extension = getFileExtension(model.name);

  if (extension === ".onnx") {
    try {
      return await model.arrayBuffer();
    } catch (cause) {
      throw new RvcError(
        ErrorCodes.MODEL_READ_FAILED,
        `Failed to read model file "${model.name}".`,
        cause,
      );
    }
  }

  if (extension === ".pth") {
    const converter = await loadPthConverter();

    try {
      const result = await converter(model, { opsetVersion: 17 });
      return toArrayBuffer(result.onnxBuffer);
    } catch (cause) {
      throw new RvcError(
        ErrorCodes.MODEL_CONVERSION_FAILED,
        `Failed to convert model "${model.name}" from .pth to .onnx.`,
        cause,
      );
    }
  }

  throw new RvcError(
    ErrorCodes.MODEL_UNSUPPORTED_FORMAT,
    `Unsupported model file "${model.name}". Only .onnx or .pth are allowed.`,
  );
}

async function loadPthConverter(): Promise<PthToOnnxFn> {
  try {
    const moduleName = "rvc-onnx-web";
    const lib = (await import(/* @vite-ignore */ moduleName)) as { pthToOnnx?: PthToOnnxFn };
    if (typeof lib.pthToOnnx !== "function") {
      throw new TypeError("Missing pthToOnnx export");
    }
    return lib.pthToOnnx;
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.MODEL_CONVERTER_UNAVAILABLE,
      'PTH conversion requires the optional dependency "rvc-onnx-web".',
      cause,
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

function toArrayBuffer(value: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  return value.slice().buffer;
}
