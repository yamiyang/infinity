"use client";

import { useState, useEffect } from "react";
import { getConfig, saveConfig, AppConfig, MODEL_PRESETS, getPreset, fetchElectronConfig, saveElectronConfig } from "@/lib/config";
import { isElectron } from "@/lib/env";

type SettingsTab = "llm" | "image";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

const LINK_ICON = (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H18m0 0v4.5m0-4.5L10.5 13.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SettingsModal({ open, onClose, initialTab }: SettingsModalProps) {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [tab, setTab] = useState<SettingsTab>(initialTab || "llm");
  const [loading, setLoading] = useState(false);
  const electronMode = isElectron();

  useEffect(() => {
    if (open) {
      if (initialTab) setTab(initialTab);
      if (electronMode) {
        // Fetch full config from backend (includes API keys)
        setLoading(true);
        fetchElectronConfig().then((cfg) => {
          setConfig(cfg);
          setLoading(false);
        });
      } else {
        setConfig(getConfig());
      }
    }
  }, [open, initialTab, electronMode]);

  const isCustom = config.provider === "custom";
  const currentPreset = !isCustom ? getPreset(config.provider) : undefined;

  const handleSelectPreset = (presetId: string) => {
    const preset = getPreset(presetId);
    if (preset) {
      setConfig({
        ...config,
        provider: presetId,
        openaiBaseUrl: preset.baseUrl,
        openaiModel: preset.defaultModel,
      });
    }
  };

  const handleSelectCustom = () => {
    setConfig({ ...config, provider: "custom" });
  };

  const handleSave = async () => {
    if (electronMode) {
      await saveElectronConfig(config);
    } else {
      saveConfig(config);
    }
    onClose();
  };

  if (!open) return null;

  const hasImageKey = !!(config.pixabayApiKey || config.pexelsApiKey || config.unsplashAccessKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-1">
            {([
              { id: "llm" as SettingsTab, label: "LLM", icon: "🤖" },
              { id: "image" as SettingsTab, label: "Image", icon: "🖼️" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
                  ${tab === t.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span>{t.label}</span>
                {t.id === "image" && !hasImageKey && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="No image keys configured" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : tab === "llm" ? (
            /* ── LLM Tab ── */
            <>
              {/* Electron mode badge */}
              {electronMode && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50/80 border border-indigo-100">
                  <span className="text-xs text-indigo-600 font-medium">Desktop Mode</span>
                  <span className="text-[10px] text-indigo-400">Keys stored securely on your device</span>
                </div>
              )}

              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2.5">Model Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {MODEL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`
                        flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer
                        ${config.provider === preset.id
                          ? "border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      <span className="text-lg leading-none">{preset.icon}</span>
                      <span className={`text-sm font-medium ${config.provider === preset.id ? "text-indigo-700" : "text-gray-700"}`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={handleSelectCustom}
                    className={`
                      flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer
                      ${isCustom
                        ? "border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <span className="text-lg leading-none">⚙️</span>
                    <span className={`text-sm font-medium ${isCustom ? "text-indigo-700" : "text-gray-700"}`}>Custom</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  API Key <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={config.openaiApiKey}
                  onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                  placeholder={currentPreset?.keyPlaceholder || "Enter your API Key..."}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                {currentPreset ? (
                  <p className="mt-1.5 text-xs text-gray-400">
                    <a href={currentPreset.keyGuideUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors">
                      {LINK_ICON}
                      {currentPreset.keyGuideText}
                    </a>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">
                    {electronMode
                      ? "Your key is stored locally on your device. Never sent to any third party."
                      : "Your key is stored locally in the browser only. Never sent to any third party."
                    }
                  </p>
                )}
              </div>

              {/* Base URL */}
              {isCustom ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">API Base URL</label>
                  <input
                    type="text"
                    value={config.openaiBaseUrl}
                    onChange={(e) => setConfig({ ...config, openaiBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-400">Any OpenAI-compatible endpoint URL.</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400">
                  <span className="font-mono text-gray-500">{config.openaiBaseUrl}</span>
                </div>
              )}

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                {currentPreset ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {currentPreset.models.map((model) => (
                        <button
                          key={model}
                          onClick={() => setConfig({ ...config, openaiModel: model })}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                            ${config.openaiModel === model
                              ? "bg-indigo-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }
                          `}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={config.openaiModel}
                      onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                      placeholder={currentPreset.defaultModel}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                    <p className="text-xs text-gray-400">Pick from above or type any model name.</p>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.openaiModel}
                    onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
                    placeholder="Model name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                )}
              </div>
            </>
          ) : (
            /* ── Image Tab ── */
            <>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
                <span className="text-lg leading-none mt-0.5">🖼️</span>
                <div className="text-xs text-amber-800/80 leading-relaxed">
                  <p className="font-medium text-amber-900 mb-1">Image Search Keys (Optional)</p>
                  <p>Configure at least one provider to enable real photos in generated pages via <code className="px-1 py-0.5 rounded bg-amber-100/80 text-amber-700 font-mono text-[10px]">&lt;inf-image&gt;</code>. Without any key, images fall back to CSS gradients.</p>
                </div>
              </div>

              {/* Pixabay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pixabay API Key</label>
                <input
                  type="password"
                  value={config.pixabayApiKey}
                  onChange={(e) => setConfig({ ...config, pixabayApiKey: e.target.value })}
                  placeholder="Your Pixabay key..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                  <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors">
                    {LINK_ICON} Get free key at pixabay.com/api/docs
                  </a>
                </p>
              </div>

              {/* Pexels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pexels API Key</label>
                <input
                  type="password"
                  value={config.pexelsApiKey}
                  onChange={(e) => setConfig({ ...config, pexelsApiKey: e.target.value })}
                  placeholder="Your Pexels key..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                  <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors">
                    {LINK_ICON} Get free key at pexels.com/api
                  </a>
                </p>
              </div>

              {/* Unsplash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Unsplash Access Key</label>
                <input
                  type="password"
                  value={config.unsplashAccessKey}
                  onChange={(e) => setConfig({ ...config, unsplashAccessKey: e.target.value })}
                  placeholder="Your Unsplash key..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <p className="mt-1 text-xs text-gray-400">
                  <a href="https://unsplash.com/developers" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors">
                    {LINK_ICON} Get free key at unsplash.com/developers
                  </a>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400">
            {electronMode ? "Keys stored securely on device." : "All keys stored locally only."}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!config.openaiApiKey.trim() || (!isCustom ? false : !config.openaiBaseUrl.trim())}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
