// ============================================================
// <wc-card> — AI-generated card grid component
//
// Usage:
//   <wc-card query="6 个热门旅游景点" cols="3" count="6"></wc-card>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCCard extends WCBase {
  protected readonly componentType = "card";
}

export function defineWCCard() {
  if (!customElements.get("wc-card")) {
    customElements.define("wc-card", WCCard);
  }
}
