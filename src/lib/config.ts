"use client";

import { isElectron } from "./env";

const CONFIG_KEY = "infinity_config";

export interface AppConfig {
  provider: string; // preset id or "custom"
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  pixabayApiKey: string;
  pexelsApiKey: string;
  unsplashAccessKey: string;
}

export interface ModelPreset {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
  models: string[];
  defaultModel: string;
  keyPlaceholder: string;
  keyGuideUrl: string;
  keyGuideText: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini"],
    defaultModel: "gpt-4o",
    keyPlaceholder: "sk-...",
    keyGuideUrl: "https://platform.openai.com/api-keys",
    keyGuideText: "Get your key at OpenAI Platform → API Keys",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-v4-flash",
    keyPlaceholder: "sk-...",
    keyGuideUrl: "https://platform.deepseek.com/api_keys",
    keyGuideText: "Get your key at DeepSeek Platform → API Keys",
  },
  {
    id: "anthropic-openrouter",
    name: "Claude (OpenRouter)",
    icon: "🔮",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["anthropic/claude-sonnet-4", "anthropic/claude-4o", "anthropic/claude-3.5-sonnet"],
    defaultModel: "anthropic/claude-sonnet-4",
    keyPlaceholder: "sk-or-...",
    keyGuideUrl: "https://openrouter.ai/keys",
    keyGuideText: "Get your key at OpenRouter → Keys",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    icon: "💎",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    defaultModel: "gemini-2.5-flash",
    keyPlaceholder: "AIza...",
    keyGuideUrl: "https://aistudio.google.com/apikey",
    keyGuideText: "Get your key at Google AI Studio → Get API Key",
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    icon: "☁️",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo"],
    defaultModel: "qwen-plus",
    keyPlaceholder: "sk-...",
    keyGuideUrl: "https://help.aliyun.com/zh/model-studio/get-api-key",
    keyGuideText: "Get your key at Alibaba Cloud Bailian Console",
  },
  {
    id: "doubao",
    name: "Doubao (ByteDance)",
    icon: "🫘",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["doubao-1.5-pro-256k", "doubao-1.5-pro-32k", "doubao-1.5-lite-32k"],
    defaultModel: "doubao-1.5-pro-256k",
    keyPlaceholder: "Enter your API Key...",
    keyGuideUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    keyGuideText: "Get your key at Volcengine Ark Console",
  },
  {
    id: "glm",
    name: "GLM (Zhipu AI)",
    icon: "🧠",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-flash", "glm-4-long"],
    defaultModel: "glm-4-plus",
    keyPlaceholder: "Enter your API Key...",
    keyGuideUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    keyGuideText: "Get your key at Zhipu AI Platform → API Keys",
  },
];

const DEFAULT_CONFIG: AppConfig = {
  provider: "openai",
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
  pixabayApiKey: "",
  pexelsApiKey: "",
  unsplashAccessKey: "",
};

export function getPreset(id: string): ModelPreset | undefined {
  return MODEL_PRESETS.find((p) => p.id === id);
}

// ============================================================
// Web mode: localStorage-based config (unchanged behavior)
// ============================================================

function getLocalConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveLocalConfig(config: Partial<AppConfig>): void {
  if (typeof window === "undefined") return;
  const current = getLocalConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

// ============================================================
// Electron mode: server-backed config via API
// ============================================================

// In-memory cache for electron config (to avoid blocking reads)
let _electronConfigCache: AppConfig | null = null;
let _electronConfigLoaded = false;

/** Fetch full config from backend (Electron mode) */
export async function fetchElectronConfig(): Promise<AppConfig> {
  try {
    const res = await fetch("/api/config?action=full");
    const data = await res.json();
    const cfg = { ...DEFAULT_CONFIG, ...data };
    _electronConfigCache = cfg;
    _electronConfigLoaded = true;
    return cfg;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Save config to backend (Electron mode) */
export async function saveElectronConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const current = _electronConfigCache || DEFAULT_CONFIG;
    const merged = { ...current, ...config };
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
    _electronConfigCache = merged;
  } catch {
    // ignore
  }
}

/** Check if electron has API key configured (uses cached safe config) */
export async function isElectronConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    return !!data.hasApiKey;
  } catch {
    return false;
  }
}

// ============================================================
// Unified interface (auto-detect mode)
// ============================================================

/** Get config synchronously — works for both modes.
 *  In Electron mode, returns cached config (call fetchElectronConfig first).
 */
export function getConfig(): AppConfig {
  if (isElectron()) {
    return _electronConfigCache || DEFAULT_CONFIG;
  }
  return getLocalConfig();
}

/** Save config — auto-detects mode */
export function saveConfig(config: Partial<AppConfig>): void {
  if (isElectron()) {
    // Fire and forget async save
    saveElectronConfig(config);
  } else {
    saveLocalConfig(config);
  }
}

/** Check if configured — synchronous check for web, may need async for electron */
export function isConfigured(): boolean {
  if (isElectron()) {
    // Use cached value
    if (_electronConfigCache) return !!_electronConfigCache.openaiApiKey;
    return _electronConfigLoaded ? false : true; // Assume configured until loaded
  }
  const config = getLocalConfig();
  return !!config.openaiApiKey;
}

/** Get Next.js basePath for constructing URLs in client-side navigation */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
