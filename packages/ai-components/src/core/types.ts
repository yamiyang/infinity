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
  /**
   * Custom LLM request function — must return an async iterable of string chunks.
   * 如果不提供，则使用内置的 OpenAI 兼容请求函数（需要配置 apiKey）。
   */
  request?: LLMRequestFn;
  /** API Key — 配合内置请求函数使用（OpenAI 兼容格式） */
  apiKey?: string;
  /** API Base URL — 默认 https://api.deepseek.com */
  baseUrl?: string;
  /** 模型名称 — 默认 deepseek-chat */
  model?: string;
  /** Optional custom system prompt override */
  systemPrompt?: string;
}

/** Extend Window for the global config */
declare global {
  interface Window {
    __ai_components?: AIComponentsConfig;
  }
}
