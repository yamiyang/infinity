// ============================================================
// <wc-chart> — AI-generated chart/visualization component
//
// Usage:
//   <wc-chart query="浏览器市场份额: Chrome 65%, Safari 18%, Firefox 3%" chart-type="bar"></wc-chart>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCChart extends WCBase {
  protected readonly componentType = "chart";
}

export function defineWCChart() {
  if (!customElements.get("wc-chart")) {
    customElements.define("wc-chart", WCChart);
  }
}
