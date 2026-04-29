// ============================================================
// WCBase — Abstract base class for all wc-* Web Components
//
// Handles: loading shimmer, streaming buffer, rAF rendering,
//          postMessage communication, error display.
//
// Same pattern as Infinity's <inf-component>.
// ============================================================

import { getRegistry, nextCompId } from "./registry";

/**
 * Rendering mode:
 * - "postMessage": delegate LLM call to parent frame (default, like inf-component)
 * - "direct": call LLM directly from within the component (self-contained)
 */
export type RenderMode = "postMessage" | "direct";

export abstract class WCBase extends HTMLElement {
  /** Unique component instance id */
  protected _compId = "";

  /** Component type identifier (e.g., "content", "table", "card") */
  protected abstract readonly componentType: string;

  /** Rendering state */
  private _buffer = "";
  private _started = false;
  private _contentEl: HTMLElement | null = null;
  private _rafId: number | null = null;
  private _needsRender = false;

  // ── Lifecycle ──────────────────────────────────────────────

  connectedCallback() {
    const query = this.getAttribute("query") || "";
    if (!query) return;

    this._compId = nextCompId();

    // Base styles
    this.style.display = "block";
    this.style.width = this.style.width || "100%";
    this.style.minWidth = "0";
    this.style.position = "relative";
    this.style.overflow = "hidden";
    this.style.minHeight = this.style.minHeight || "120px";

    const aspect = this.getAttribute("aspect");
    if (aspect) this.style.aspectRatio = aspect;

    // Show loading shimmer
    this._showLoading(query);

    // Register callbacks
    const registry = getRegistry();
    registry._active++;

    registry._cbs[this._compId] = {
      onToken: (token: string) => this._onToken(token),
      onDone: (html: string) => this._onDone(html),
      onError: (msg?: string) => this._onError(msg),
    };

    // Request generation via postMessage
    const style = this.getAttribute("comp-style") || this.getAttribute("style-hint") || "";
    const meta = this._collectMeta();

    window.parent.postMessage(
      {
        type: "wc-generate",
        compId: this._compId,
        query,
        style,
        componentType: this.componentType,
        meta,
      },
      "*"
    );
  }

  disconnectedCallback() {
    if (this._compId && window.__wc?._cbs[this._compId]) {
      delete window.__wc._cbs[this._compId];
      window.__wc._active = Math.max(0, window.__wc._active - 1);
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  // ── Streaming handlers ─────────────────────────────────────

  private _onToken(token: string) {
    this._buffer += token;

    if (!this._started) {
      const idx = this._buffer.indexOf("<");
      if (idx >= 0) {
        this._started = true;
        this.innerHTML = "";
        this.style.position = "";
        this.style.minHeight = "";
        this._contentEl = document.createElement("div");
        this._contentEl.style.cssText = "width:100%;";
        this.appendChild(this._contentEl);
      }
    }

    if (this._started) this._scheduleRender();
  }

  private _onDone(html: string) {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    let final = html && html.length > 0 ? html : this._buffer;
    if (this._buffer.length > final.length) final = this._buffer;

    this.style.position = "";
    this.style.minHeight = "";
    this.style.overflow = "";
    this.innerHTML =
      final ||
      '<div style="padding:12px;color:rgba(99,102,241,0.5);font-size:12px;text-align:center;">No content generated</div>';
    this._contentEl = null;
  }

  private _onError(msg?: string) {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    const displayMsg = msg || "Failed to generate component";
    this.innerHTML = `<div style="padding:12px;color:rgba(239,68,68,0.7);font-size:12px;text-align:center;border:1px dashed rgba(239,68,68,0.3);border-radius:0.5rem;">${displayMsg}</div>`;
  }

  // ── rAF batched rendering ──────────────────────────────────

  private _doRender() {
    if (!this._contentEl) return;
    this._contentEl.innerHTML = this._buffer;
    this._needsRender = false;
  }

  private _scheduleRender() {
    this._needsRender = true;
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (this._needsRender) this._doRender();
    });
  }

  // ── Loading shimmer ────────────────────────────────────────

  private _showLoading(query: string) {
    const shortQuery = query.length > 60 ? query.slice(0, 60) + "…" : query;
    this.innerHTML =
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(168,85,247,0.05));border-radius:0.75rem;border:1px dashed rgba(99,102,241,0.2);padding:16px;">' +
      '<div style="width:24px;height:24px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:wc-spin 0.8s linear infinite;"></div>' +
      '<div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:90%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Generating: ' +
      shortQuery +
      "</div>" +
      "</div>" +
      "<style>@keyframes wc-spin{to{transform:rotate(360deg)}}</style>";
  }

  // ── Meta attributes ────────────────────────────────────────

  /** Collect extra attributes as meta for specialized components */
  protected _collectMeta(): Record<string, string> {
    const meta: Record<string, string> = {};
    const attrs = this.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const name = attrs[i].name;
      if (["query", "comp-style", "style-hint", "aspect", "style", "class", "id"].includes(name))
        continue;
      meta[name] = attrs[i].value;
    }
    return meta;
  }
}
