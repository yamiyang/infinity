"use client";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { HistoryItem, SelectionContext } from "@/types";
import { SYSTEM_PROMPT, buildUserPrompt, PrefetchedData, REVISION_SYSTEM_PROMPT, buildRevisionPrompt, COMPONENT_SYSTEM_PROMPT } from "./prompt";
import { getConfig } from "./config";
import { isElectron } from "./env";

// ============================================================
// Web mode: direct browser OpenAI calls (unchanged)
// ============================================================

function getClient(): OpenAI {
  const config = getConfig();
  return new OpenAI({
    apiKey: config.openaiApiKey || "",
    baseURL: config.openaiBaseUrl || "https://api.openai.com/v1",
    dangerouslyAllowBrowser: true,
  });
}

function getModel(): string {
  const config = getConfig();
  return config.openaiModel || "gpt-4o";
}

// ============================================================
// Electron mode: stream via backend SSE proxy
// ============================================================

async function streamViaProxy(
  endpoint: string,
  messages: ChatCompletionMessageParam[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
  temperature = 0.85,
  max_tokens = 12000,
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature, max_tokens }),
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

    // Parse SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

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
        if (e instanceof SyntaxError) continue; // Malformed JSON, skip
        throw e;
      }
    }
  }

  return fullText;
}

// ============================================================
// Unified streaming functions
// ============================================================

/** Helper to strip markdown code fences from LLM output */
function stripCodeFence(text: string): string {
  let cleaned = text.replace(/^```(?:html|HTML)?\s*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  const htmlIdx = cleaned.search(/<[!a-zA-Z]/);
  if (htmlIdx > 0) cleaned = cleaned.slice(htmlIdx);
  return cleaned;
}

/**
 * Stream page generation.
 * Web: browser direct LLM call. Electron: via /api/llm/generate proxy.
 */
export async function streamGeneratePage(
  query: string | undefined,
  title: string | undefined,
  description: string | undefined,
  history: HistoryItem[],
  onToken: (token: string) => void,
  prefetchedData?: PrefetchedData,
  selectionContext?: SelectionContext,
  signal?: AbortSignal,
  deviceInfo?: { width: number; mobile: boolean; lang?: string }
): Promise<string> {
  const userPrompt = buildUserPrompt(query, title, description, history, prefetchedData, selectionContext, deviceInfo);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  if (isElectron()) {
    // Electron: proxy through backend
    let fullText = "";
    let started = false;
    let buffer = "";

    const raw = await streamViaProxy("/api/llm/generate", messages, (token) => {
      fullText += token;
      if (!started) {
        buffer += token;
        const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
        const htmlStart = stripped.search(/<[!a-zA-Z]/);
        if (htmlStart >= 0) {
          started = true;
          const htmlContent = stripped.slice(htmlStart);
          if (htmlContent) onToken(htmlContent);
        }
      } else {
        onToken(token);
      }
    }, signal);

    return stripCodeFence(raw || fullText);
  }

  // Web mode: direct OpenAI call from browser
  const client = getClient();
  const model = getModel();

  const stream = await client.chat.completions.create(
    {
      model,
      messages,
      temperature: 0.85,
      max_tokens: 12000,
      stream: true,
    },
    { signal }
  );

  let fullText = "";
  let started = false;
  let buffer = "";

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;

    if (!started) {
      buffer += delta;
      const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
      const htmlStart = stripped.search(/<[!a-zA-Z]/);
      if (htmlStart >= 0) {
        started = true;
        const htmlContent = stripped.slice(htmlStart);
        if (htmlContent) onToken(htmlContent);
      }
    } else {
      onToken(delta);
    }
  }

  return stripCodeFence(fullText);
}

/**
 * Stream revision generation.
 */
export async function streamRevisionPage(
  annotatedHtml: string,
  history: HistoryItem[],
  extraPrompt: string,
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const userPrompt = buildRevisionPrompt(annotatedHtml, history, extraPrompt);
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: REVISION_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  if (isElectron()) {
    let fullText = "";
    let started = false;
    let buffer = "";

    const raw = await streamViaProxy("/api/llm/generate", messages, (token) => {
      fullText += token;
      if (!started) {
        buffer += token;
        const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
        const htmlStart = stripped.search(/<[!a-zA-Z]/);
        if (htmlStart >= 0) {
          started = true;
          const htmlContent = stripped.slice(htmlStart);
          if (htmlContent) onToken(htmlContent);
        }
      } else {
        onToken(token);
      }
    }, signal, 0.7);

    return stripCodeFence(raw || fullText);
  }

  const client = getClient();
  const model = getModel();

  const stream = await client.chat.completions.create(
    {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 12000,
      stream: true,
    },
    { signal }
  );

  let fullText = "";
  let started = false;
  let buffer = "";

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;

    if (!started) {
      buffer += delta;
      const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
      const htmlStart = stripped.search(/<[!a-zA-Z]/);
      if (htmlStart >= 0) {
        started = true;
        const htmlContent = stripped.slice(htmlStart);
        if (htmlContent) onToken(htmlContent);
      }
    } else {
      onToken(delta);
    }
  }

  return stripCodeFence(fullText);
}

/**
 * Stream component content generation (lightweight HTML fragment).
 */
export async function streamComponentContent(
  query: string,
  styleHint: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  lang?: string
): Promise<string> {
  const userParts: string[] = [];
  if (lang) userParts.push(`Browser language: ${lang}`);
  if (styleHint) userParts.push(`Style hint: ${styleHint}`);
  userParts.push(`Generate: ${query}`);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: COMPONENT_SYSTEM_PROMPT },
    { role: "user", content: userParts.join("\n") },
  ];

  if (isElectron()) {
    let compText = "";
    let compStarted = false;
    let compBuf = "";

    const raw = await streamViaProxy("/api/llm/component", messages, (token) => {
      compText += token;
      if (!compStarted) {
        compBuf += token;
        const stripped = compBuf.replace(/^```(?:html|HTML)?\s*\n?/, "");
        const idx = stripped.search(/<[a-zA-Z]/);
        if (idx >= 0) {
          compStarted = true;
          const content = stripped.slice(idx);
          if (content) onToken(content);
        }
      } else {
        onToken(token);
      }
    }, signal, 0.85, 4000);

    return stripCodeFence(raw || compText);
  }

  const client = getClient();
  const model = getModel();

  const stream = await client.chat.completions.create(
    {
      model,
      messages,
      temperature: 0.85,
      max_tokens: 4000,
      stream: true,
    },
    { signal }
  );

  let compText = "";
  let compStarted = false;
  let compBuf = "";

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    compText += delta;

    if (!compStarted) {
      compBuf += delta;
      const stripped = compBuf.replace(/^```(?:html|HTML)?\s*\n?/, "");
      const idx = stripped.search(/<[a-zA-Z]/);
      if (idx >= 0) {
        compStarted = true;
        const content = stripped.slice(idx);
        if (content) onToken(content);
      }
    } else {
      onToken(delta);
    }
  }

  return stripCodeFence(compText);
}
