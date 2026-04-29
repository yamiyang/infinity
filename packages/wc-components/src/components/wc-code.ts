// ============================================================
// <wc-code> — AI-generated code block component
//
// Usage:
//   <wc-code query="React 自定义 hook: useLocalStorage" language="typescript"></wc-code>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCCode extends WCBase {
  protected readonly componentType = "code";
}

export function defineWCCode() {
  if (!customElements.get("wc-code")) {
    customElements.define("wc-code", WCCode);
  }
}
