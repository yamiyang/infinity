// ============================================================
// ai-components — LLM Stream Interface
//
// Calls the globally-provided LLM request function.
// Supports two modes:
//   1. Simple: configure({ apiKey: 'sk-...' })  — uses built-in OpenAI-compatible streaming
//   2. Custom: configure({ request: fn })       — bring your own request function
// ============================================================

import type { AIComponentsConfig, LLMRequestFn } from "./types";
import { SYSTEM_PROMPT, getDepthAwareSystemPrompt } from "./prompt";

let _config: AIComponentsConfig | null = null;

// ── Built-in OpenAI-compatible streaming request ────────────────

/**
 * 内置的 OpenAI 兼容流式请求函数。
 * 当用户只配置 apiKey 时自动使用。
 */
function createBuiltinRequest(config: AIComponentsConfig): LLMRequestFn {
  const baseUrl = (config.baseUrl || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = config.model || "deepseek-chat";
  const apiKey = config.apiKey!;

  return async function* builtinRequest(prompt, options) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: options?.systemPrompt || "" },
          { role: "user", content: prompt },
        ],
      }),
      signal: options?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[ai-components] API Error ${res.status}: ${err}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch { /* skip malformed chunks */ }
      }
    }
  };
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Configure the global LLM request function.
 * Must be called before any <ai-component> is connected.
 *
 * @example
 * // 极简配置 — 只需 API Key
 * AIC.configure({ apiKey: 'sk-...' });
 *
 * // 自定义 baseUrl 和 model
 * AIC.configure({ apiKey: 'sk-...', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' });
 *
 * // 完全自定义请求函数
 * AIC.configure({ request: myCustomRequestFn });
 */
export function configure(config: AIComponentsConfig): void {
  // 如果用户没有提供 request 但提供了 apiKey，则使用内置请求函数
  if (!config.request && config.apiKey) {
    config.request = createBuiltinRequest(config);
  }
  _config = config;
  // Also store on window for cross-module access
  if (typeof window !== "undefined") {
    window.__ai_components = config;
  }
}

/** Get the current configuration */
export function getConfig(): AIComponentsConfig | null {
  if (_config) return _config;
  if (typeof window !== "undefined" && window.__ai_components) {
    _config = window.__ai_components;
    return _config;
  }
  return null;
}

/** Get the LLM request function */
export function getRequestFn(): LLMRequestFn {
  const config = getConfig();
  if (!config?.request) {
    throw new Error(
      "[ai-components] LLM not configured. " +
      "Call configure({ apiKey: 'sk-...' }) or configure({ request: fn }) before using AI components."
    );
  }
  return config.request;
}

/** Get the system prompt (custom or built-in, depth-aware) */
export function getSystemPrompt(depth?: number): string {
  const config = getConfig();
  // If the user supplied a custom systemPrompt, use it as-is (they own the strategy)
  if (config?.systemPrompt) return config.systemPrompt;
  // Otherwise use the depth-aware built-in prompt
  return depth != null ? getDepthAwareSystemPrompt(depth) : SYSTEM_PROMPT;
}

/**
 * Stream LLM content for a given prompt.
 * @param prompt  - user-facing prompt text
 * @param signal  - optional AbortSignal
 * @param depth   - nesting depth of the calling <ai-component> (1-based)
 * @param systemPromptOverride - optional custom system prompt (bypasses depth-aware logic)
 */
export async function* streamLLM(
  prompt: string,
  signal?: AbortSignal,
  depth?: number,
  systemPromptOverride?: string,
): AsyncGenerator<string> {
  const requestFn = getRequestFn();
  const systemPrompt = systemPromptOverride ?? getSystemPrompt(depth);

  const iterable = requestFn(prompt, { signal, systemPrompt });

  for await (const chunk of iterable) {
    if (signal?.aborted) return;
    yield chunk;
  }
}
