// ============================================================
// <wc-form> — AI-generated form component
//
// Usage:
//   <wc-form query="用户注册: 姓名, 邮箱, 密码, 角色下拉, 同意条款" layout="vertical"></wc-form>
// ============================================================

import { WCBase } from "../core/base-element";

export class WCForm extends WCBase {
  protected readonly componentType = "form";
}

export function defineWCForm() {
  if (!customElements.get("wc-form")) {
    customElements.define("wc-form", WCForm);
  }
}
