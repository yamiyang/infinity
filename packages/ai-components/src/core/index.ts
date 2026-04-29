// ============================================================
// core/ — Shared utilities re-exported for convenience
// ============================================================

export { IncrementalDOMBuilder, parseTag, parseAttributes } from "./dom-builder";
export { configure, getConfig, getRequestFn, getSystemPrompt, streamLLM } from "./stream";
export { SYSTEM_PROMPT, buildPrompt } from "./prompt";

export type {
  LLMRequestFn,
  LLMRequestOptions,
  AIComponentsConfig,
} from "./types";
