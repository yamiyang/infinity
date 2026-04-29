// ============================================================
// wc-components — Type Definitions
// ============================================================

/** LLM provider configuration */
export interface WCConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Provider preset definition */
export interface WCPreset {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
  models: string[];
  defaultModel: string;
}

/** Streaming callback */
export type OnToken = (token: string) => void;

/** Component message sent via postMessage to request generation */
export interface WCGenerateMessage {
  type: "wc-generate";
  compId: string;
  query: string;
  style: string;
  componentType: string;
  meta?: Record<string, string>;
}

/** Component callback registry (attached to window) */
export interface WCRegistry {
  _cbs: Record<
    string,
    {
      onToken: (token: string) => void;
      onDone: (html: string) => void;
      onError: (msg?: string) => void;
    }
  >;
  _active: number;
  token: (id: string, tk: string) => void;
  done: (id: string, html: string) => void;
  error: (id: string, msg?: string) => void;
}

/** Extend Window for the global registry */
declare global {
  interface Window {
    __wc?: WCRegistry;
    __wcConfig?: WCConfig;
  }
}
