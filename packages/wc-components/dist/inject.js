// src/inject.ts
function buildWCScript() {
  return `
(function() {
  "use strict";
  if (window.__wc) return; // Already initialized

  var _compId = 0;

  // \u2500\u2500 Global registry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  window.__wc = {
    _cbs: {},
    _active: 0,
    token: function(id, tk) {
      var cb = this._cbs[id];
      if (cb) cb.onToken(tk);
    },
    done: function(id, html) {
      var cb = this._cbs[id];
      if (cb) {
        cb.onDone(html);
        delete this._cbs[id];
        this._active = Math.max(0, this._active - 1);
        window.parent.postMessage({ type: 'wc-finished', remaining: this._active }, '*');
      }
    },
    error: function(id, msg) {
      var cb = this._cbs[id];
      if (cb) {
        cb.onError(msg);
        delete this._cbs[id];
        this._active = Math.max(0, this._active - 1);
        window.parent.postMessage({ type: 'wc-finished', remaining: this._active }, '*');
      }
    }
  };

  // \u2500\u2500 Loading shimmer style \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (!document.getElementById('wc-spin-style')) {
    var s = document.createElement('style');
    s.id = 'wc-spin-style';
    s.textContent = '@keyframes wc-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  // \u2500\u2500 Base class \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function WCBase() {}
  WCBase.prototype = Object.create(HTMLElement.prototype);
  WCBase.prototype.constructor = WCBase;

  WCBase.prototype.connectedCallback = function() {
    var self = this;
    var query = this.getAttribute('query') || '';
    if (!query) return;

    this._id = 'wc-' + (++_compId);
    this._compStyle = this.getAttribute('comp-style') || this.getAttribute('style-hint') || '';
    var aspect = this.getAttribute('aspect') || '';

    this.style.display = 'block';
    this.style.width = this.style.width || '100%';
    this.style.minWidth = '0';
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.style.minHeight = this.style.minHeight || '120px';
    if (aspect) this.style.aspectRatio = aspect;

    // Loading shimmer
    var shortQ = query.length > 60 ? query.slice(0, 60) + '\u2026' : query;
    this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(168,85,247,0.05));border-radius:0.75rem;border:1px dashed rgba(99,102,241,0.2);padding:16px;">'
      + '<div style="width:24px;height:24px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:wc-spin 0.8s linear infinite;"></div>'
      + '<div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:90%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Generating: ' + shortQ + '</div>'
      + '</div>';

    var buffer = '';
    var started = false;
    var contentEl = null;
    var rafId = null;
    var needsRender = false;

    function doRender() {
      if (!contentEl) return;
      contentEl.innerHTML = buffer;
      needsRender = false;
    }

    function scheduleRender() {
      needsRender = true;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(function() {
        rafId = null;
        if (needsRender) doRender();
      });
    }

    window.__wc._active++;

    window.__wc._cbs[this._id] = {
      onToken: function(token) {
        buffer += token;
        if (!started) {
          var idx = buffer.indexOf('<');
          if (idx >= 0) {
            started = true;
            self.innerHTML = '';
            self.style.position = '';
            self.style.minHeight = '';
            contentEl = document.createElement('div');
            contentEl.style.cssText = 'width:100%;';
            self.appendChild(contentEl);
          }
        }
        if (started) scheduleRender();
      },
      onDone: function(html) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        var final = html && html.length > 0 ? html : buffer;
        if (buffer.length > final.length) final = buffer;
        self.style.position = '';
        self.style.minHeight = '';
        self.style.overflow = '';
        self.innerHTML = final || '<div style="padding:12px;color:rgba(99,102,241,0.5);font-size:12px;text-align:center;">No content generated</div>';
        contentEl = null;
      },
      onError: function(msg) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        var m = msg || 'Failed to generate component';
        self.innerHTML = '<div style="padding:12px;color:rgba(239,68,68,0.7);font-size:12px;text-align:center;border:1px dashed rgba(239,68,68,0.3);border-radius:0.5rem;">' + m + '</div>';
      }
    };

    // Collect meta attributes
    var meta = {};
    var attrs = this.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name;
      if (['query','comp-style','style-hint','aspect','style','class','id'].indexOf(name) >= 0) continue;
      meta[name] = attrs[i].value;
    }

    window.parent.postMessage({
      type: 'wc-generate',
      compId: this._id,
      query: query,
      style: this._compStyle,
      componentType: this._wcType || 'content',
      meta: meta
    }, '*');
  };

  WCBase.prototype.disconnectedCallback = function() {
    if (this._id && window.__wc && window.__wc._cbs[this._id]) {
      delete window.__wc._cbs[this._id];
      window.__wc._active = Math.max(0, window.__wc._active - 1);
    }
  };

  // \u2500\u2500 Define all components \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  var types = [
    ['wc-content', 'content'],
    ['wc-table', 'table'],
    ['wc-card', 'card'],
    ['wc-list', 'list'],
    ['wc-chart', 'chart'],
    ['wc-form', 'form'],
    ['wc-hero', 'hero'],
    ['wc-faq', 'faq'],
    ['wc-timeline', 'timeline'],
    ['wc-code', 'code']
  ];

  for (var t = 0; t < types.length; t++) {
    (function(tagName, wcType) {
      if (customElements.get(tagName)) return;

      var Comp = function() {
        return HTMLElement.call(this) || this;
      };
      Comp.prototype = Object.create(HTMLElement.prototype);
      Comp.prototype.constructor = Comp;
      Comp.prototype._wcType = wcType;
      Comp.prototype.connectedCallback = WCBase.prototype.connectedCallback;
      Comp.prototype.disconnectedCallback = WCBase.prototype.disconnectedCallback;

      customElements.define(tagName, Comp);
    })(types[t][0], types[t][1]);
  }
})();
`;
}
function buildWCRegistryScript() {
  return `
(function() {
  if (window.__wc) return;
  var _compId = 0;
  window.__wc = {
    _cbs: {},
    _active: 0,
    token: function(id, tk) { var cb = this._cbs[id]; if (cb) cb.onToken(tk); },
    done: function(id, html) { var cb = this._cbs[id]; if (cb) { cb.onDone(html); delete this._cbs[id]; this._active = Math.max(0, this._active - 1); window.parent.postMessage({ type: 'wc-finished', remaining: this._active }, '*'); } },
    error: function(id, msg) { var cb = this._cbs[id]; if (cb) { cb.onError(msg); delete this._cbs[id]; this._active = Math.max(0, this._active - 1); window.parent.postMessage({ type: 'wc-finished', remaining: this._active }, '*'); } }
  };
})();
`;
}
export {
  buildWCRegistryScript,
  buildWCScript
};
//# sourceMappingURL=inject.js.map