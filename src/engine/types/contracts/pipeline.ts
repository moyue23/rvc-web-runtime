import type { EngineState } from "../runtime/runtime";

/**
 * External input files for one pipeline run.
 */
export type PipelineFiles = {
  model: File;
  audio: File;
  contentVec: File;
  rmvpe: File;
  index?: File;
};

/**
 * Events emitted by the pipeline to report observable milestones.
 */
export type PipelineEvent =
  | { type: "stage"; stage: EngineState }
  | { type: "chunk"; current: number; total: number };

/**
 * Optional callbacks for observing pipeline state and chunk progress.
 */
export type PipelineCallbacks = {
  onEvent?: (event: PipelineEvent) => void;
};
