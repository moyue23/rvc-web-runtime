import { pthToOnnx } from "rvc-onnx-web";
import { RvcError } from "../errors/RvcError";
import { ErrorCodes } from "../errors/errorCodes";

interface ConvertedPthModel {
  onnxBuffer: ArrayBuffer;
  metaData: {
    sampleRate: number;
    version: string;
    useF0: boolean;
  };
}

/**
 * Converts an RVC `.pth` file into `.onnx` binary data.
 */
export async function convertPthToOnnx(model: File): Promise<ConvertedPthModel> {
  try {
    const { onnxBuffer, sampleRate, checkpoint } = await pthToOnnx(model);

    return {
      onnxBuffer: onnxBuffer.slice().buffer,
      metaData: {
        sampleRate,
        version: checkpoint.version,
        useF0: checkpoint.useF0,
      },
    };
  } catch (cause) {
    throw new RvcError(
      ErrorCodes.MODEL_CONVERSION_FAILED,
      `Failed to convert model "${model.name}" from .pth to .onnx.`,
      cause,
    );
  }
}
