"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  CARD_SYSTEM_PROMPT: () => CARD_SYSTEM_PROMPT,
  CHART_SYSTEM_PROMPT: () => CHART_SYSTEM_PROMPT,
  CODE_SYSTEM_PROMPT: () => CODE_SYSTEM_PROMPT,
  COMPONENT_SYSTEM_PROMPT: () => COMPONENT_SYSTEM_PROMPT,
  FAQ_SYSTEM_PROMPT: () => FAQ_SYSTEM_PROMPT,
  FORM_SYSTEM_PROMPT: () => FORM_SYSTEM_PROMPT,
  HERO_SYSTEM_PROMPT: () => HERO_SYSTEM_PROMPT,
  LIST_SYSTEM_PROMPT: () => LIST_SYSTEM_PROMPT,
  PRESETS: () => PRESETS,
  TABLE_SYSTEM_PROMPT: () => TABLE_SYSTEM_PROMPT,
  TIMELINE_SYSTEM_PROMPT: () => TIMELINE_SYSTEM_PROMPT,
  WCBase: () => WCBase,
  WCCard: () => WCCard,
  WCChart: () => WCChart,
  WCCode: () => WCCode,
  WCContent: () => WCContent,
  WCFAQ: () => WCFAQ,
  WCForm: () => WCForm,
  WCHero: () => WCHero,
  WCList: () => WCList,
  WCTable: () => WCTable,
  WCTimeline: () => WCTimeline,
  abortAllGenerations: () => abortAllGenerations,
  abortGeneration: () => abortGeneration,
  buildUserMessage: () => buildUserMessage,
  configFromPreset: () => configFromPreset,
  defineAll: () => defineAll,
  defineWCCard: () => defineWCCard,
  defineWCChart: () => defineWCChart,
  defineWCCode: () => defineWCCode,
  defineWCContent: () => defineWCContent,
  defineWCFAQ: () => defineWCFAQ,
  defineWCForm: () => defineWCForm,
  defineWCHero: () => defineWCHero,
  defineWCList: () => defineWCList,
  defineWCTable: () => defineWCTable,
  defineWCTimeline: () => defineWCTimeline,
  getPreset: () => getPreset,
  getRegistry: () => getRegistry,
  initWCHost: () => initWCHost,
  nextCompId: () => nextCompId,
  streamContent: () => streamContent,
  streamViaProxy: () => streamViaProxy,
  stripCodeFence: () => stripCodeFence
});
module.exports = __toCommonJS(src_exports);

// src/core/registry.ts
var _compId = 0;
function getRegistry() {
  if (!window.__wc) {
    window.__wc = {
      _cbs: {},
      _active: 0,
      token(id, tk) {
        const cb = this._cbs[id];
        if (cb) cb.onToken(tk);
      },
      done(id, html) {
        const cb = this._cbs[id];
        if (cb) {
          cb.onDone(html);
          delete this._cbs[id];
          this._active = Math.max(0, this._active - 1);
          window.parent.postMessage(
            { type: "wc-finished", remaining: this._active },
            "*"
          );
        }
      },
      error(id, msg) {
        const cb = this._cbs[id];
        if (cb) {
          cb.onError(msg);
          delete this._cbs[id];
          this._active = Math.max(0, this._active - 1);
          window.parent.postMessage(
            { type: "wc-finished", remaining: this._active },
            "*"
          );
        }
      }
    };
  }
  return window.__wc;
}
function nextCompId() {
  return "wc-" + ++_compId;
}

// src/core/base-element.ts
var WCBase = class extends HTMLElement {
  constructor() {
    super(...arguments);
    /** Unique component instance id */
    this._compId = "";
    /** Rendering state */
    this._buffer = "";
    this._started = false;
    this._contentEl = null;
    this._rafId = null;
    this._needsRender = false;
  }
  // ── Lifecycle ──────────────────────────────────────────────
  connectedCallback() {
    const query = this.getAttribute("query") || "";
    if (!query) return;
    this._compId = nextCompId();
    this.style.display = "block";
    this.style.width = this.style.width || "100%";
    this.style.minWidth = "0";
    this.style.position = "relative";
    this.style.overflow = "hidden";
    this.style.minHeight = this.style.minHeight || "120px";
    const aspect = this.getAttribute("aspect");
    if (aspect) this.style.aspectRatio = aspect;
    this._showLoading(query);
    const registry = getRegistry();
    registry._active++;
    registry._cbs[this._compId] = {
      onToken: (token) => this._onToken(token),
      onDone: (html) => this._onDone(html),
      onError: (msg) => this._onError(msg)
    };
    const style = this.getAttribute("comp-style") || this.getAttribute("style-hint") || "";
    const meta = this._collectMeta();
    window.parent.postMessage(
      {
        type: "wc-generate",
        compId: this._compId,
        query,
        style,
        componentType: this.componentType,
        meta
      },
      "*"
    );
  }
  disconnectedCallback() {
    if (this._compId && window.__wc?._cbs[this._compId]) {
      delete window.__wc._cbs[this._compId];
      window.__wc._active = Math.max(0, window.__wc._active - 1);
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
  // ── Streaming handlers ─────────────────────────────────────
  _onToken(token) {
    this._buffer += token;
    if (!this._started) {
      const idx = this._buffer.indexOf("<");
      if (idx >= 0) {
        this._started = true;
        this.innerHTML = "";
        this.style.position = "";
        this.style.minHeight = "";
        this._contentEl = document.createElement("div");
        this._contentEl.style.cssText = "width:100%;";
        this.appendChild(this._contentEl);
      }
    }
    if (this._started) this._scheduleRender();
  }
  _onDone(html) {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    let final = html && html.length > 0 ? html : this._buffer;
    if (this._buffer.length > final.length) final = this._buffer;
    this.style.position = "";
    this.style.minHeight = "";
    this.style.overflow = "";
    this.innerHTML = final || '<div style="padding:12px;color:rgba(99,102,241,0.5);font-size:12px;text-align:center;">No content generated</div>';
    this._contentEl = null;
  }
  _onError(msg) {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    const displayMsg = msg || "Failed to generate component";
    this.innerHTML = `<div style="padding:12px;color:rgba(239,68,68,0.7);font-size:12px;text-align:center;border:1px dashed rgba(239,68,68,0.3);border-radius:0.5rem;">${displayMsg}</div>`;
  }
  // ── rAF batched rendering ──────────────────────────────────
  _doRender() {
    if (!this._contentEl) return;
    this._contentEl.innerHTML = this._buffer;
    this._needsRender = false;
  }
  _scheduleRender() {
    this._needsRender = true;
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (this._needsRender) this._doRender();
    });
  }
  // ── Loading shimmer ────────────────────────────────────────
  _showLoading(query) {
    const shortQuery = query.length > 60 ? query.slice(0, 60) + "\u2026" : query;
    this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(168,85,247,0.05));border-radius:0.75rem;border:1px dashed rgba(99,102,241,0.2);padding:16px;"><div style="width:24px;height:24px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:wc-spin 0.8s linear infinite;"></div><div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:90%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Generating: ' + shortQuery + "</div></div><style>@keyframes wc-spin{to{transform:rotate(360deg)}}</style>";
  }
  // ── Meta attributes ────────────────────────────────────────
  /** Collect extra attributes as meta for specialized components */
  _collectMeta() {
    const meta = {};
    const attrs = this.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const name = attrs[i].name;
      if (["query", "comp-style", "style-hint", "aspect", "style", "class", "id"].includes(name))
        continue;
      meta[name] = attrs[i].value;
    }
    return meta;
  }
};

// src/components/wc-content.ts
var WCContent = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "content";
  }
};
function defineWCContent() {
  if (!customElements.get("wc-content")) {
    customElements.define("wc-content", WCContent);
  }
}

// src/components/wc-table.ts
var WCTable = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "table";
  }
};
function defineWCTable() {
  if (!customElements.get("wc-table")) {
    customElements.define("wc-table", WCTable);
  }
}

// src/components/wc-card.ts
var WCCard = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "card";
  }
};
function defineWCCard() {
  if (!customElements.get("wc-card")) {
    customElements.define("wc-card", WCCard);
  }
}

// src/components/wc-list.ts
var WCList = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "list";
  }
};
function defineWCList() {
  if (!customElements.get("wc-list")) {
    customElements.define("wc-list", WCList);
  }
}

// src/components/wc-chart.ts
var WCChart = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "chart";
  }
};
function defineWCChart() {
  if (!customElements.get("wc-chart")) {
    customElements.define("wc-chart", WCChart);
  }
}

// src/components/wc-form.ts
var WCForm = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "form";
  }
};
function defineWCForm() {
  if (!customElements.get("wc-form")) {
    customElements.define("wc-form", WCForm);
  }
}

// src/components/wc-hero.ts
var WCHero = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "hero";
  }
};
function defineWCHero() {
  if (!customElements.get("wc-hero")) {
    customElements.define("wc-hero", WCHero);
  }
}

// src/components/wc-faq.ts
var WCFAQ = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "faq";
  }
};
function defineWCFAQ() {
  if (!customElements.get("wc-faq")) {
    customElements.define("wc-faq", WCFAQ);
  }
}

// src/components/wc-timeline.ts
var WCTimeline = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "timeline";
  }
};
function defineWCTimeline() {
  if (!customElements.get("wc-timeline")) {
    customElements.define("wc-timeline", WCTimeline);
  }
}

// src/components/wc-code.ts
var WCCode = class extends WCBase {
  constructor() {
    super(...arguments);
    this.componentType = "code";
  }
};
function defineWCCode() {
  if (!customElements.get("wc-code")) {
    customElements.define("wc-code", WCCode);
  }
}

// src/core/stream.ts
function stripCodeFence(text) {
  let cleaned = text.replace(/^```(?:html|HTML)?\s*\n?/, "");
  cleaned = cleaned.replace(/\n?```\s*$/, "");
  const htmlIdx = cleaned.search(/<[!a-zA-Z]/);
  if (htmlIdx > 0) cleaned = cleaned.slice(htmlIdx);
  return cleaned;
}
async function streamContent(req) {
  const {
    config,
    messages,
    onToken,
    signal,
    temperature = 0.85,
    maxTokens = 4e3
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
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    }),
    signal
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
      }
    }
  }
  return fullText;
}
async function streamViaProxy(endpoint, messages, onToken, signal, temperature = 0.85, maxTokens = 4e3) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature, max_tokens: maxTokens }),
    signal
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

// src/core/prompts.ts
var COMPONENT_SYSTEM_PROMPT = `You generate a self-contained HTML fragment (NOT a full page).
Rules:
- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.
- Use Tailwind CSS classes (assume CDN is loaded in parent).
- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.
- Make content responsive and visually polished.
- Use semantic HTML. Keep code concise.
- If the user specifies a language, write content in that language.
- If a style hint is given, follow it closely.`;
var TABLE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a well-structured HTML <table> with <thead> and <tbody>.
- Use Tailwind for striped rows and hover effects.
- Make data realistic and informative.
- Include proper column headers.`;
var CARD_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a grid of cards using CSS grid or flexbox.
- Each card should have a title, description, and optional icon/emoji.
- Use rounded corners, subtle shadows, and consistent spacing.
- Make it responsive (stack on mobile).`;
var LIST_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a styled list (ordered or unordered).
- Use custom markers or numbers, not default browser bullets.
- Each item should have clear visual hierarchy.
- Add subtle spacing and hover effects.`;
var CHART_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a data visualization using pure CSS and HTML.
- Use CSS for bar charts, progress indicators, or stat displays.
- Include labels, values, and visual indicators.
- Use color to convey meaning. No JavaScript charting libraries.`;
var FORM_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate an HTML form with styled inputs.
- Use proper labels, placeholders, and input types.
- Style with Tailwind: focus rings, rounded inputs, spacing.
- Include a submit button. Make it accessible.`;
var HERO_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a hero section with a compelling headline and subtext.
- Use bold typography and gradient or solid backgrounds.
- Include a call-to-action button.
- Make it full-width and visually impactful.`;
var FAQ_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate an FAQ section with <details>/<summary> elements.
- Each Q&A pair is a collapsible <details>.
- Style the summary as a question with arrow indicators.
- Add smooth spacing and borders between items.`;
var TIMELINE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a vertical timeline with events.
- Use a central or left-aligned line with dots/circles for each event.
- Each event has a date/time and description.
- Alternate layout or consistent left-aligned.`;
var CODE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a code example in a styled <pre><code> block.
- Use a dark background with syntax-highlighted colors (manual, no JS lib).
- Include line numbers if appropriate.
- Add a language label and optional copy hint.`;
function buildUserMessage(query, styleHint, lang, extra) {
  const parts = [];
  if (lang) parts.push(`Language: ${lang}`);
  if (styleHint) parts.push(`Style: ${styleHint}`);
  if (extra) parts.push(extra);
  parts.push(`Generate: ${query}`);
  return parts.join("\n");
}

// src/core/host.ts
var PROMPT_MAP = {
  content: COMPONENT_SYSTEM_PROMPT,
  table: TABLE_SYSTEM_PROMPT,
  card: CARD_SYSTEM_PROMPT,
  list: LIST_SYSTEM_PROMPT,
  chart: CHART_SYSTEM_PROMPT,
  form: FORM_SYSTEM_PROMPT,
  hero: HERO_SYSTEM_PROMPT,
  faq: FAQ_SYSTEM_PROMPT,
  timeline: TIMELINE_SYSTEM_PROMPT,
  code: CODE_SYSTEM_PROMPT
};
var activeGenerations = /* @__PURE__ */ new Map();
function initWCHost(options) {
  const { config, systemPrompt, prompts, onStart, onDone, onError } = options;
  const handler = async (event) => {
    const data = event.data;
    if (!data || data.type !== "wc-generate") return;
    const { compId, query, style, componentType, meta } = data;
    const iframeWin = event.source || null;
    if (!iframeWin) return;
    const sysPrompt = systemPrompt || prompts?.[componentType] || PROMPT_MAP[componentType] || COMPONENT_SYSTEM_PROMPT;
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
      { role: "user", content: userMessage }
    ];
    const abortController = new AbortController();
    activeGenerations.set(compId, abortController);
    onStart?.(compId, query);
    let fullText = "";
    let started = false;
    let buffer = "";
    try {
      await streamContent({
        config,
        messages,
        signal: abortController.signal,
        temperature: config.temperature ?? 0.85,
        maxTokens: config.maxTokens ?? 4e3,
        onToken: (token) => {
          fullText += token;
          if (!started) {
            buffer += token;
            const stripped = buffer.replace(/^```(?:html|HTML)?\s*\n?/, "");
            const idx = stripped.search(/<[a-zA-Z]/);
            if (idx >= 0) {
              started = true;
              const content = stripped.slice(idx);
              if (content) {
                try {
                  iframeWin.__wc?.token(compId, content);
                } catch {
                }
              }
            }
          } else {
            try {
              iframeWin.__wc?.token(compId, token);
            } catch {
            }
          }
        }
      });
      const cleaned = stripCodeFence(fullText);
      try {
        iframeWin.__wc?.done(compId, cleaned);
      } catch {
      }
      onDone?.(compId);
    } catch (err) {
      if (abortController.signal.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      try {
        iframeWin.__wc?.error(compId, error.message);
      } catch {
      }
      onError?.(compId, error);
    } finally {
      activeGenerations.delete(compId);
    }
  };
  window.addEventListener("message", handler);
  return () => {
    window.removeEventListener("message", handler);
    for (const [, controller] of activeGenerations) {
      controller.abort();
    }
    activeGenerations.clear();
  };
}
function abortGeneration(compId) {
  const controller = activeGenerations.get(compId);
  if (controller) {
    controller.abort();
    activeGenerations.delete(compId);
    return true;
  }
  return false;
}
function abortAllGenerations() {
  for (const [, controller] of activeGenerations) {
    controller.abort();
  }
  activeGenerations.clear();
}

// src/core/presets.ts
var PRESETS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "\u{1F7E2}",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
    defaultModel: "gpt-4o"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "\u{1F40B}",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat"
  },
  {
    id: "anthropic-openrouter",
    name: "Claude (OpenRouter)",
    icon: "\u{1F52E}",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["anthropic/claude-sonnet-4", "anthropic/claude-3.5-sonnet"],
    defaultModel: "anthropic/claude-sonnet-4"
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "\u{1F48E}",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    defaultModel: "gemini-2.5-flash"
  },
  {
    id: "qwen",
    name: "Qwen",
    icon: "\u2601\uFE0F",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo"],
    defaultModel: "qwen-plus"
  },
  {
    id: "doubao",
    name: "Doubao",
    icon: "\u{1FAD8}",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["doubao-1.5-pro-256k", "doubao-1.5-pro-32k"],
    defaultModel: "doubao-1.5-pro-256k"
  },
  {
    id: "glm",
    name: "GLM",
    icon: "\u{1F9E0}",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-flash"],
    defaultModel: "glm-4-plus"
  }
];
function getPreset(id) {
  return PRESETS.find((p) => p.id === id);
}
function configFromPreset(presetId, apiKey) {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);
  return {
    apiKey,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel
  };
}

// src/index.ts
function defineAll() {
  defineWCContent();
  defineWCTable();
  defineWCCard();
  defineWCList();
  defineWCChart();
  defineWCForm();
  defineWCHero();
  defineWCFAQ();
  defineWCTimeline();
  defineWCCode();
}
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (typeof globalThis.WC !== "undefined") {
    defineAll();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CARD_SYSTEM_PROMPT,
  CHART_SYSTEM_PROMPT,
  CODE_SYSTEM_PROMPT,
  COMPONENT_SYSTEM_PROMPT,
  FAQ_SYSTEM_PROMPT,
  FORM_SYSTEM_PROMPT,
  HERO_SYSTEM_PROMPT,
  LIST_SYSTEM_PROMPT,
  PRESETS,
  TABLE_SYSTEM_PROMPT,
  TIMELINE_SYSTEM_PROMPT,
  WCBase,
  WCCard,
  WCChart,
  WCCode,
  WCContent,
  WCFAQ,
  WCForm,
  WCHero,
  WCList,
  WCTable,
  WCTimeline,
  abortAllGenerations,
  abortGeneration,
  buildUserMessage,
  configFromPreset,
  defineAll,
  defineWCCard,
  defineWCChart,
  defineWCCode,
  defineWCContent,
  defineWCFAQ,
  defineWCForm,
  defineWCHero,
  defineWCList,
  defineWCTable,
  defineWCTimeline,
  getPreset,
  getRegistry,
  initWCHost,
  nextCompId,
  streamContent,
  streamViaProxy,
  stripCodeFence
});
//# sourceMappingURL=wc-components.cjs.map