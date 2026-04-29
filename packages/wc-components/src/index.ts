// ============================================================
// wc-components
//
// Natural-language-driven Web Components powered by LLM.
// Drop <wc-content>, <wc-table>, <wc-card> into any HTML.
// Framework-free. Zero dependencies.
// ============================================================

// --- Components ---
export { WCContent, defineWCContent } from "./components/wc-content";
export { WCTable, defineWCTable } from "./components/wc-table";
export { WCCard, defineWCCard } from "./components/wc-card";
export { WCList, defineWCList } from "./components/wc-list";
export { WCChart, defineWCChart } from "./components/wc-chart";
export { WCForm, defineWCForm } from "./components/wc-form";
export { WCHero, defineWCHero } from "./components/wc-hero";
export { WCFAQ, defineWCFAQ } from "./components/wc-faq";
export { WCTimeline, defineWCTimeline } from "./components/wc-timeline";
export { WCCode, defineWCCode } from "./components/wc-code";

// --- Core ---
export { WCBase } from "./core/base-element";
export { getRegistry, nextCompId } from "./core/registry";
export { streamContent, streamViaProxy, stripCodeFence } from "./core/stream";
export { initWCHost, abortGeneration, abortAllGenerations } from "./core/host";
export { PRESETS, getPreset, configFromPreset } from "./core/presets";
export {
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
} from "./core/prompts";

// --- Types ---
export type {
  WCConfig,
  WCPreset,
  OnToken,
  WCGenerateMessage,
  WCRegistry,
} from "./types";

// --- Batch registration ---
import { defineWCContent } from "./components/wc-content";
import { defineWCTable } from "./components/wc-table";
import { defineWCCard } from "./components/wc-card";
import { defineWCList } from "./components/wc-list";
import { defineWCChart } from "./components/wc-chart";
import { defineWCForm } from "./components/wc-form";
import { defineWCHero } from "./components/wc-hero";
import { defineWCFAQ } from "./components/wc-faq";
import { defineWCTimeline } from "./components/wc-timeline";
import { defineWCCode } from "./components/wc-code";

/**
 * Register all wc-* custom elements at once.
 * Call this once at app startup.
 */
export function defineAll() {
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

// Auto-register when loaded via IIFE <script> tag
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // Check if loaded as IIFE (not ESM import)
  if (typeof (globalThis as Record<string, unknown>).WC !== "undefined") {
    defineAll();
  }
}
