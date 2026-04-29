// ============================================================
// LLM Streaming Engine (framework-free, pure fetch)
// Supports: direct OpenAI-compatible API + SSE proxy
// ============================================================

import type { WCConfig, OnToken } from "../types";

export interface StreamRequest {
  config: WCConfig;
  messages: Array<{ role: string; content: string }>;
  onToken: OnToken;
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
}

/** Strip markdown code fences from LLM output */
export function stripCodeFence(text: string): string {
  let cleaned = text.replace(/^```(?:html|HTML)?\s*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  const htmlIdx = cleaned.search(/<[!a-zA-Z]/);
  if (htmlIdx > 0) cleaned = cleaned.slice(htmlIdx);
  return cleaned;
}

/**
 * Stream content from an OpenAI-compatible API (direct browser call).
 * Uses raw fetch + ReadableStream — no SDK dependency.
 */
export async function streamContent(req: StreamRequest): Promise<string> {
  const {
    config,
    messages,
    onToken,
    signal,
    temperature = 0.85,
    maxTokens = 4000,
  } = req;

  const baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
  const model = config.model || "gpt-4o";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let sseBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onToken(delta);
        }
      } catch {
        // Malformed JSON, skip
      }
    }
  }

  return fullText;
}

/**
 * Stream content via an SSE proxy endpoint (for Electron / server-side key).
 */
export async function streamViaProxy(
  endpoint: string,
  messages: Array<{ role: string; content: string }>,
  onToken: OnToken,
  signal?: AbortSignal,
  temperature = 0.85,
  maxTokens = 4000
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature, max_tokens: maxTokens }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.content) {
          fullText += parsed.content;
          onToken(parsed.content);
        }
        if (parsed.error) throw new Error(parsed.error);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullText;
}
