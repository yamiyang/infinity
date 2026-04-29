// ============================================================
// <wc-list> — AI-generated list component
//
// Usage:
//   <wc-list query="REST API 设计最佳实践" ordered="true" max-items="10"></wc-list>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCList extends WCBase {
  protected readonly componentType = "list";
}

export function defineWCList() {
  if (!customElements.get("wc-list")) {
    customElements.define("wc-list", WCList);
  }
}
