// ============================================================
// <wc-hero> — AI-generated hero section component
//
// Usage:
//   <wc-hero query="下一代 AI 开发平台" comp-style="gradient purple-600 to blue-600"></wc-hero>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCHero extends WCBase {
  protected readonly componentType = "hero";
}

export function defineWCHero() {
  if (!customElements.get("wc-hero")) {
    customElements.define("wc-hero", WCHero);
  }
}
