// ============================================================
// ai-components — Type Definitions
// ============================================================

/** LLM request function signature — provided globally by the host app */
export type LLMRequestFn = (
  prompt: string,
  options?: LLMRequestOptions,
) => AsyncIterable<string>;

/** Options for the LLM request */
export interface LLMRequestOptions {
  signal?: AbortSignal;
  systemPrompt?: string;
}

/** Global configuration for ai-components */
export interface AIComponentsConfig {
  /** The LLM request function — must return an async iterable of string chunks */
  request: LLMRequestFn;
  /** Optional custom system prompt override */
  systemPrompt?: string;
}

/** Extend Window for the global config */
declare global {
  interface Window {
    __ai_components?: AIComponentsConfig;
  }
}
