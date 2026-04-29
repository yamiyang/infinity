// ============================================================
// ai-components
//
// Natural-language-driven Web Component powered by LLM.
// Drop <ai-component p="your prompt"> into any HTML.
// Framework-free. Zero dependencies.
// ============================================================

// --- Components ---
export { AIComponent, defineAIComponent } from "./components/ai-component";

// --- Core ---
export { IncrementalDOMBuilder, parseTag, parseAttributes } from "./core/dom-builder";
export { configure, getConfig, getRequestFn, getSystemPrompt, streamLLM } from "./core/stream";
export { SYSTEM_PROMPT, buildPrompt, getDepthAwareSystemPrompt, MAX_DEPTH } from "./core/prompt";

// --- Types ---
export type {
  LLMRequestFn,
  LLMRequestOptions,
  AIComponentsConfig,
} from "./core/types";

// Auto-register when loaded via IIFE <script> tag
import { defineAIComponent as _define } from "./components/ai-component";

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (typeof (globalThis as Record<string, unknown>).AIC !== "undefined") {
    _define();
  }
}
