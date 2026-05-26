export interface ModelMetaData {
  sampleRate: number;
  version: string;
  useF0: boolean;
}

export interface ConvertedPthModel {
  onnxBuffer: ArrayBuffer;
  metaData: ModelMetaData;
}

export interface PreparedModel {
  onnxBuffer: ArrayBuffer;
  metaData?: ModelMetaData;
}
