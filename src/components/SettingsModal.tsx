"use client";

import { useState, useEffect } from "react";
import { getConfig, saveConfig, AppConfig } from "@/lib/config";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<AppConfig>(getConfig());

  useEffect(() => {
    if (open) setConfig(getConfig());
  }, [open]);

  const handleSave = () => {
    saveConfig(config);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">设置</h2>
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
        <div className="px-6 py-5 space-y-5">
          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Key <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={config.openaiApiKey}
              onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <p className="mt-1 text-xs text-gray-400">必填。密钥仅保存在浏览器本地，不会发送到任何第三方。</p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Base URL</label>
            <input
              type="text"
              value={config.openaiBaseUrl}
              onChange={(e) => setConfig({ ...config, openaiBaseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <p className="mt-1 text-xs text-gray-400">支持 OpenAI 兼容接口（如 DeepSeek、通义千问等）。</p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">模型</label>
            <input
              type="text"
              value={config.openaiModel}
              onChange={(e) => setConfig({ ...config, openaiModel: e.target.value })}
              placeholder="gpt-4o"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!config.openaiApiKey.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
