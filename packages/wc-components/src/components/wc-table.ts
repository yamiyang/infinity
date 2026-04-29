// ============================================================
// <wc-table> — AI-generated table component
//
// Usage:
//   <wc-table query="对比 React、Vue、Angular 的特性" columns="5" sortable="true"></wc-table>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCTable extends WCBase {
  protected readonly componentType = "table";
}

export function defineWCTable() {
  if (!customElements.get("wc-table")) {
    customElements.define("wc-table", WCTable);
  }
}
