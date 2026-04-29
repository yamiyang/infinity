// ============================================================
// Global component registry (window.__wc)
// Same pattern as Infinity's window.__infComp
// ============================================================

import type { WCRegistry } from "../types";

let _compId = 0;

/** Get or create the global WC registry */
export function getRegistry(): WCRegistry {
  if (!window.__wc) {
    window.__wc = {
      _cbs: {},
      _active: 0,
      token(id: string, tk: string) {
        const cb = this._cbs[id];
        if (cb) cb.onToken(tk);
      },
      done(id: string, html: string) {
        const cb = this._cbs[id];
        if (cb) {
          cb.onDone(html);
          delete this._cbs[id];
          this._active = Math.max(0, this._active - 1);
          window.parent.postMessage(
            { type: "wc-finished", remaining: this._active },
            "*"
          );
        }
      },
      error(id: string, msg?: string) {
        const cb = this._cbs[id];
        if (cb) {
          cb.onError(msg);
          delete this._cbs[id];
          this._active = Math.max(0, this._active - 1);
          window.parent.postMessage(
            { type: "wc-finished", remaining: this._active },
            "*"
          );
        }
      },
    };
  }
  return window.__wc;
}

/** Generate a unique component ID */
export function nextCompId(): string {
  return "wc-" + ++_compId;
}
