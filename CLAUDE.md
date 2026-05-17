# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RVC-Web-Runtime is a WebGPU-accelerated inference engine for **Singing Voice Conversion (SVC)** based on RVC, running 100% in the browser using `onnxruntime-web`.

### Important: SVC vs Real-time Voice Conversion

This project is specifically designed for **offline singing voice conversion (翻唱)**, NOT real-time voice changing:

| Aspect            | SVC (This Project)                        | Real-time VC                |
| ----------------- | ----------------------------------------- | --------------------------- |
| **Input**         | Full songs (3-5 minutes)                  | Short audio chunks (~100ms) |
| **Latency**       | Not a concern (batch processing)          | Critical (<50ms)            |
| **Memory**        | Must handle long sequences (OOM risk)     | Small, fixed buffers        |
| **Feature Model** | ContentVec (strips timbre, keeps content) | Standard HuBERT or other    |
| **Feature Layer** | Layer 12 (global context for melody)      | Varies                      |
| **Processing**    | Chunked/sliding window for long audio     | Frame-by-frame streaming    |

### Architecture Implications for SVC

1. **ContentVec over HuBERT**: We use ContentVec (a disentangled HuBERT variant) to extract speaker-agnostic content features. Standard HuBERT retains source singer's timbre, causing "half-original, half-target" artifacts in covers.

2. **Layer 12 Features**: For singing (wide pitch range, complex melodies), we extract features from transformer layer 12 (top layer) which has better global context compared to middle layers used for speech.

3. **Long Audio Handling**: Full songs cannot be processed at once due to WebGPU memory limits. Chunking must be handled at the **pipeline level** (not inside individual stages) to ensure Stage A (feature) and Stage B (pitch) remain frame-aligned.

4. **16kHz Strict Requirement**: ContentVec/HuBERT models require exactly 16,000 Hz input. Any other sample rate will produce garbage features.

## Build Commands

- `npm run dev` - Start Vite dev server (requires COOP/COEP headers for SharedArrayBuffer)
- `npm run build` - Run TypeScript check and build production bundle to `dist/`
- `npm run preview` - Serve the built app locally from `dist/`
- `npm run lint` / `npm run lint:fix` - Run ESLint check or auto-fix
- `npm run format` / `npm run format:check` - Apply or verify Prettier formatting

## Architecture

### Pipeline Flow

The inference pipeline follows a strict 6-stage state machine defined in `src/engine/pipeline/runPipeline.ts`:

1. **input_preparation** - Decode source audio to mono PCM
2. **model_parsing** - Load ONNX model or convert .pth to ONNX
3. **feature_extraction** - Extract HuBERT features from audio
4. **pitch_estimation** - Estimate F0/pitch using RMVPE
5. **voice_synthesis** - Run ONNX inference with features + pitch
6. **post_processing** - Encode output to WAV

### Core Structure

```
src/
├── engine/                 # UI-agnostic inference engine
│   ├── pipeline/           # Pipeline orchestration (runPipeline)
│   ├── audio/              # Audio decode, resample, load
│   ├── model/              # Model loading, .pth→ONNX conversion, session factory
│   ├── feature/            # HuBERT feature extraction
│   ├── pitch/              # RMVPE pitch estimation
│   ├── synth/              # Voice synthesis stage
│   ├── errors/             # RvcError class and error codes
│   └── types/              # RuntimeContext, contracts, state types
└── app/                    # Demo UI (main.ts entrypoint)
```

### Key Abstractions

- **RuntimeContext** (`src/engine/types/runtime/runtime.ts`) - Shared state object passed through all pipeline stages containing audio buffers, model session, features, and progress
- **EngineState** - Discriminated union of pipeline stages: `"idle" | "input_preparation" | "model_parsing" | "feature_extraction" | "pitch_estimation" | "voice_synthesis" | "post_processing" | "success" | "failed"`
- **SessionFactory** (`src/engine/model/sessionFactory.ts`) - Creates ONNX Runtime sessions with backend fallback (WebGPU → WASM)

## Code Conventions

### Module Architecture

Follow the `audio/` module pattern for all new modules:

```
src/engine/{module}/
├── index.ts          # Single entry: exports types + main orchestration function
├── {task}.ts         # Task-specific implementations (e.g., preprocess.ts, loader.ts)
└── types.ts          # Module-specific interfaces
```

**Rules:**

1. **One main function per module** - `index.ts` exports exactly one orchestration function (e.g., `extractHubertFeatures`, `prepareInputAudio`)
2. **Single responsibility** - Each sub-module (e.g., `preprocess.ts`, `model.ts`) handles one specific task
3. **Internal helpers stay internal** - Helper functions are NOT exported; only the main orchestration function is exposed
4. **Newspaper code structure** - Main orchestration function appears at the **top** of the file; helper functions are placed **below** it. Like reading a newspaper: headline first, details follow
5. **index.ts pattern**:
   ```typescript
   // Export types
   export type { Foo } from "./types";
   // Internal imports
   import { subTaskA } from "./sub-a";
   import { subTaskB } from "./sub-b";
   // Main orchestration function
   export async function mainFunction(input): Promise<Output> {
     const a = await subTaskA(input);
     const b = await subTaskB(a);
     return formatResult(b);
   }
   ```

### Comments

- **Module entry functions** (e.g., `prepareInputAudio`, `prepareModel`, `preprocessForContentVec`): Keep JSDoc minimal or omit. One-line summary is sufficient.
- **Implementation details / algorithms**: Document complex logic (e.g., Z-Score normalization, crossfade merging).
- **Public utilities**: Document parameters and return types for reusable helper functions.

### TypeScript

- Use `interface` for object shapes, including config objects, return objects, and module domain data
- Use `type` for unions, function signatures, constructor signatures, utility types, and other non-object aliases
- Avoid inline object types like `{ ... }` in function signatures unless the shape is very short, used only once, and unlikely to expand
- Extract an object type into a named `interface` when:
  - it is reused across files,
  - it appears more than once in a file,
  - it represents a clear domain concept,
  - or it is a return object with 2 or more fields that may expand later
- All error codes must include a domain prefix: `AUDIO_`, `MODEL_`
- Throw `RvcError` with appropriate `ErrorCode` for domain errors

### File Naming

- Use lowercase kebab-case for module files
- Keep entry modules explicit: `main.ts`, `*.config.ts`

### Formatting

Prettier config: 2-space indent, semicolons, double quotes, trailing commas, 100 char width.

### Vite Configuration Notes

- WASM files from `onnxruntime-web` are copied to `dist/onnx-wasm/` via `vite-plugin-static-copy`
- Dev server sets COOP/COEP headers for SharedArrayBuffer support
- `onnxruntime-web` is excluded from `optimizeDeps` to avoid bundling issues

## Development Notes

- No test framework is currently configured; use `npm run build && npm run lint && npm run format:check` as quality gates
- When adding tests, colocate them near implementation (`src/**`) and use `*.test.ts` naming
- Model weights and `dist/` are gitignored; validate asset paths before releases
- Uses `type: "module"` (ES modules only)

## Commit & Pull Request Guidelines

- Follow Conventional Commit style: `feat:`, `chore:`, `ci:`, `refactor:`, `fix:`, etc.
- Keep commits focused and scoped to one change set; include "why" in the body for non-obvious updates
- PRs should include:
  - concise summary of behavior changes,
  - linked issue/task when applicable,
  - verification steps run locally (e.g., `npm run build && npm run lint`),
  - screenshots or recordings for visible UI/runtime changes

## Security & Configuration Tips

- Do not commit secrets, model weights, or generated artifacts from `dist/`
- Validate large model/runtime asset paths before release, especially ONNX/WASM copy behavior in Vite config
