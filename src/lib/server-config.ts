/**
 * Server-side config store for Electron mode.
 * Stores API keys in memory (persisted to disk by Electron main process).
 * This module runs ONLY on the server (Node.js / Next.js API routes).
 */

import type { AppConfig } from "./config";
import fs from "fs";
import path from "path";

const DEFAULT_SERVER_CONFIG: AppConfig = {
  provider: "openai",
  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o",
  pixabayApiKey: "",
  pexelsApiKey: "",
  unsplashAccessKey: "",
};

let _config: AppConfig = { ...DEFAULT_SERVER_CONFIG };
let _configPath: string | null = null;
let _initialized = false;

/** Auto-initialize from env var if available */
function ensureInit() {
  if (_initialized) return;
  _initialized = true;
  const envPath = process.env.INFINITY_CONFIG_PATH;
  if (envPath) {
    _configPath = envPath;
    loadFromDisk();
  }
}

/** Initialize the config file path (called from Electron main process) */
export function initConfigPath(filePath: string) {
  _configPath = filePath;
  _initialized = true;
  loadFromDisk();
}

function loadFromDisk() {
  if (!_configPath) return;
  try {
    if (fs.existsSync(_configPath)) {
      const raw = fs.readFileSync(_configPath, "utf-8");
      _config = { ...DEFAULT_SERVER_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    _config = { ...DEFAULT_SERVER_CONFIG };
  }
}

function saveToDisk() {
  if (!_configPath) return;
  try {
    const dir = path.dirname(_configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(_configPath, JSON.stringify(_config, null, 2), "utf-8");
  } catch {
    // ignore write errors
  }
}

export function getServerConfig(): AppConfig {
  ensureInit();
  return { ..._config };
}

export function saveServerConfig(partial: Partial<AppConfig>): AppConfig {
  ensureInit();
  _config = { ..._config, ...partial };
  saveToDisk();
  return { ..._config };
}

/** Return a safe version of config (API keys masked) for the frontend */
export function getSafeConfig(): Omit<AppConfig, "openaiApiKey" | "pixabayApiKey" | "pexelsApiKey" | "unsplashAccessKey"> & {
  hasApiKey: boolean;
  hasPixabayKey: boolean;
  hasPexelsKey: boolean;
  hasUnsplashKey: boolean;
} {
  ensureInit();
  return {
    provider: _config.provider,
    openaiBaseUrl: _config.openaiBaseUrl,
    openaiModel: _config.openaiModel,
    hasApiKey: !!_config.openaiApiKey,
    hasPixabayKey: !!_config.pixabayApiKey,
    hasPexelsKey: !!_config.pexelsApiKey,
    hasUnsplashKey: !!_config.unsplashAccessKey,
  };
}
