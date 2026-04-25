"use client";

const CONFIG_KEY = "infinity_config";

export interface AppConfig {
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
}

const DEFAULT_CONFIG: AppConfig = {
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
};

export function getConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<AppConfig>): void {
  if (typeof window === "undefined") return;
  const current = getConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

export function isConfigured(): boolean {
  const config = getConfig();
  return !!config.openaiApiKey;
}
