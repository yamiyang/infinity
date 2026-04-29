// ============================================================
// <wc-faq> — AI-generated FAQ accordion component
//
// Usage:
//   <wc-faq query="TypeScript 初学者常见问题" count="6"></wc-faq>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCFAQ extends WCBase {
  protected readonly componentType = "faq";
}

export function defineWCFAQ() {
  if (!customElements.get("wc-faq")) {
    customElements.define("wc-faq", WCFAQ);
  }
}
