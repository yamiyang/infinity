// ============================================================
// <wc-content> — General AI content component
//
// Usage:
//   <wc-content query="量子计算的简要介绍" comp-style="light, indigo"></wc-content>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCContent extends WCBase {
  protected readonly componentType = "content";
}

export function defineWCContent() {
  if (!customElements.get("wc-content")) {
    customElements.define("wc-content", WCContent);
  }
}
