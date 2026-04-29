// ============================================================
// WC Host — Parent frame listener for wc-generate messages
//
// Usage: call `initWCHost(config)` in the parent page to handle
// all <wc-*> component generation requests from child iframes.
//
// This is the equivalent of Infinity's page.tsx postMessage listener.
// ============================================================

import type { WCConfig, WCGenerateMessage } from "../types";
import { streamContent, stripCodeFence } from "./stream";
import {
  COMPONENT_SYSTEM_PROMPT,
  TABLE_SYSTEM_PROMPT,
  CARD_SYSTEM_PROMPT,
  LIST_SYSTEM_PROMPT,
  CHART_SYSTEM_PROMPT,
  FORM_SYSTEM_PROMPT,
  HERO_SYSTEM_PROMPT,
  FAQ_SYSTEM_PROMPT,
  TIMELINE_SYSTEM_PROMPT,
  CODE_SYSTEM_PROMPT,
  buildUserMessage,
} from "./prompts";

/** Map component type to its system prompt */
const PROMPT_MAP: Record<string, string> = {
  content: COMPONENT_SYSTEM_PROMPT,
  table: TABLE_SYSTEM_PROMPT,
  card: CARD_SYSTEM_PROMPT,
  list: LIST_SYSTEM_PROMPT,
  chart: CHART_SYSTEM_PROMPT,
  form: FORM_SYSTEM_PROMPT,
  hero: HERO_SYSTEM_PROMPT,
  faq: FAQ_SYSTEM_PROMPT,
  timeline: TIMELINE_SYSTEM_PROMPT,
  code: CODE_SYSTEM_PROMPT,
};

interface HostOptions {
  /** LLM configuration */
  config: WCConfig;
  /** Custom system prompt override (for all components) */
  systemPrompt?: string;
  /** Per-type system prompt overrides */
  prompts?: Partial<Record<string, string>>;
  /** SSE proxy endpoint (if using proxy mode instead of direct API) */
  proxyEndpoint?: string;
  /** Called when a component starts generating */
  onStart?: (compId: string, query: string) => void;
  /** Called when a component finishes */
  onDone?: (compId: string) => void;
  /** Called on error */
  onError?: (compId: string, error: Error) => void;
}

/** Active abort controllers for running generations */
const activeGenerations = new Map<string, AbortController>();

/**
 * Initialize the WC Host — listens for wc-generate messages and
 * streams LLM content back to components via iframe.__wc.token().
 *
 * @returns cleanup function to remove the listener
 */
export function initWCHost(options: HostOptions): () => void {
  const { config, systemPrompt, prompts, onStart, onDone, onError } = options;

  const handler = async (event: MessageEvent) => {
    const data = event.data as WCGenerateMessage;
    if (!data || data.type !== "wc-generate") return;

    const { compId, query, style, componentType, meta } = data;
    const iframeWin = (event.source as Window) || null;
    if (!iframeWin) return;

    // Get the appropriate system prompt
    const sysPrompt =
      systemPrompt ||
      prompts?.[componentType] ||
      PROMPT_MAP[componentType] ||
      COMPONENT_SYSTEM_PROMPT;

    // Build extra instructions from meta attributes
    let extra = "";
    if (meta) {
      const entries = Object.entries(meta);
      if (entries.length > 0) {
        extra = entries.map(([k, v]) => `${k}: ${v}`).join(", ");
      }
    }

    const lang = meta?.lang || "";
    const userMessage = buildUserMessage(query, style, lang, extra);

    const messages = [
      { role: "system", content: sysPrompt },
      { role: "user", content: userMessage },
    ];

    const abortController = new AbortController();
    activeGenerations.set(compId, abortController);

    onStart?.(compId, query);

    // Streaming state
    let fullText = "";
    let started = false;
    let buffer = "";

    try {
      await streamContent({
        config,
        messages,
        signal: abortController.signal,
        temperature: config.temperature ?? 0.85,
        maxTokens: config.maxTokens ?? 4000,
        onToken: (token: string) => {
          fullText += token;

          if (!started) {
            buffer += token;
            const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
            const idx = stripped.search(/<[a-zA-Z]/);
            if (idx >= 0) {
              started = true;
              const content = stripped.slice(idx);
              if (content) {
                try { iframeWin.__wc?.token(compId, content); } catch { /* cross-origin */ }
              }
            }
          } else {
            try { iframeWin.__wc?.token(compId, token); } catch { /* cross-origin */ }
          }
        },
      });

      const cleaned = stripCodeFence(fullText);
      try { iframeWin.__wc?.done(compId, cleaned); } catch { /* cross-origin */ }
      onDone?.(compId);
    } catch (err) {
      if (abortController.signal.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      try { iframeWin.__wc?.error(compId, error.message); } catch { /* cross-origin */ }
      onError?.(compId, error);
    } finally {
      activeGenerations.delete(compId);
    }
  };

  window.addEventListener("message", handler);

  return () => {
    window.removeEventListener("message", handler);
    // Abort all running generations
    for (const [, controller] of activeGenerations) {
      controller.abort();
    }
    activeGenerations.clear();
  };
}

/** Abort a specific component's generation */
export function abortGeneration(compId: string): boolean {
  const controller = activeGenerations.get(compId);
  if (controller) {
    controller.abort();
    activeGenerations.delete(compId);
    return true;
  }
  return false;
}

/** Abort all running generations */
export function abortAllGenerations(): void {
  for (const [, controller] of activeGenerations) {
    controller.abort();
  }
  activeGenerations.clear();
}
