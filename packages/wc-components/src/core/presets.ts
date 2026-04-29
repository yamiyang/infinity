// ============================================================
// LLM Provider Presets
// ============================================================

import type { WCPreset, WCConfig } from "../types";

export const PRESETS: WCPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "🟢",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "o3-mini"],
    defaultModel: "gpt-4o",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    icon: "🐋",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
  },
  {
    id: "anthropic-openrouter",
    name: "Claude (OpenRouter)",
    icon: "🔮",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["anthropic/claude-sonnet-4", "anthropic/claude-3.5-sonnet"],
    defaultModel: "anthropic/claude-sonnet-4",
  },
  {
    id: "gemini",
    name: "Gemini",
    icon: "💎",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "qwen",
    name: "Qwen",
    icon: "☁️",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo"],
    defaultModel: "qwen-plus",
  },
  {
    id: "doubao",
    name: "Doubao",
    icon: "🫘",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["doubao-1.5-pro-256k", "doubao-1.5-pro-32k"],
    defaultModel: "doubao-1.5-pro-256k",
  },
  {
    id: "glm",
    name: "GLM",
    icon: "🧠",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-plus", "glm-4-flash"],
    defaultModel: "glm-4-plus",
  },
];

/** Get a preset by id */
export function getPreset(id: string): WCPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Create a WCConfig from a preset id + apiKey */
export function configFromPreset(presetId: string, apiKey: string): WCConfig {
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);
  return {
    apiKey,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
  };
}
