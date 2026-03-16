import type { EngineState, RuntimeContext } from "../runtime/runtime";

/**
 * External input files for one pipeline run.
 */
export type PipelineFiles = {
  model: File;
  audio: File;
  contentVec: File;
  index?: File;
};

/**
 * Optional callbacks for observing pipeline progress/state.
 */
export type PipelineCallbacks = {
  onStateChange?: (state: EngineState, progress: number, context: RuntimeContext) => void;
};
