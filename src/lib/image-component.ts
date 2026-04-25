"use client";

import { getConfig } from "./config";
import { isElectron } from "./env";

/**
 * Build the <inf-image> Web Component script to inject into iframes.
 * In web mode: reads API keys from config and bakes them into the script.
 * In Electron mode: uses proxy API at /api/image-search.
 */
export function buildImageComponentScript(): string {
  const electronMode = isElectron();

  if (electronMode) {
    // Electron: use backend proxy for image search
    return `
(function() {
  if (customElements.get('inf-image')) return;

  var IS_ELECTRON = true;
  var CACHE_PREFIX = 'inf-img-';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  var _usedUrls = new Set();
  var _hasKeys = null; // lazy loaded

  function cacheGet(query) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + query);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + query); return null; }
      return data.url;
    } catch(e) { return null; }
  }

  function cacheSet(query, url) {
    try { localStorage.setItem(CACHE_PREFIX + query, JSON.stringify({ url: url, ts: Date.now() })); } catch(e) {}
  }

  function cacheDel(query) {
    try { localStorage.removeItem(CACHE_PREFIX + query); } catch(e) {}
  }

  async function checkKeys() {
    if (_hasKeys !== null) return _hasKeys;
    try {
      var res = await fetch('/api/image-search', { method: 'POST' });
      var data = await res.json();
      _hasKeys = !!(data.hasPixabay || data.hasPexels || data.hasUnsplash);
      return _hasKeys;
    } catch(e) { _hasKeys = false; return false; }
  }

  async function findImageViaProxy(query, exclude) {
    var providers = ['pixabay', 'pexels', 'unsplash'];
    for (var i = 0; i < providers.length; i++) {
      try {
        var res = await fetch('/api/image-search?q=' + encodeURIComponent(query) + '&count=5&provider=' + providers[i]);
        var data = await res.json();
        var urls = data.urls || [];
        var filtered = urls.filter(function(u) { return !exclude.has(u) && !_usedUrls.has(u); });
        if (filtered.length > 0) return filtered[0];
      } catch(e) {}
    }
    return null;
  }

  var REFRESH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/><path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14"/></svg>';

  class InfImage extends HTMLElement {
    connectedCallback() {
      var self = this;
      this._query = this.getAttribute('query') || '';
      this._aspect = this.getAttribute('aspect') || '16/9';
      this._alt = this.getAttribute('alt') || this._query;
      this._currentUrl = null;

      if (!this._query) return;

      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.style.borderRadius = this.style.borderRadius || '0.5rem';
      this.style.aspectRatio = this._aspect;
      this.style.width = this.style.width || '100%';

      checkKeys().then(function(hasKeys) {
        if (!hasKeys) {
          self.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';
          self.style.cursor = 'pointer';
          self.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:16px;">'
            + '<div style="font-size:28px;opacity:0.5;">🖼️</div>'
            + '<div style="font-size:12px;color:rgba(99,102,241,0.7);text-align:center;line-height:1.4;max-width:80%;">'
            + '<div style="font-weight:600;margin-bottom:2px;">Click to configure image keys</div>'
            + '<div style="font-size:10px;opacity:0.7;">' + self._query + '</div>'
            + '</div></div>';
          self.onclick = function(e) { e.preventDefault(); e.stopPropagation(); window.parent.postMessage({ type: 'open-image-settings' }, '*'); };
          return;
        }
        self._loadImage(false);
      });
    }

    _loadImage(forceRefresh) {
      var self = this;
      var query = this._query;
      var alt = this._alt;

      this.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;">'
        + '<div style="width:32px;height:32px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:inf-img-spin 0.8s linear infinite;"></div>'
        + '<div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:80%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + query + '</div>'
        + '</div><style>@keyframes inf-img-spin{to{transform:rotate(360deg)}}</style>';

      if (!forceRefresh) {
        var cached = cacheGet(query);
        if (cached) { self._currentUrl = cached; _usedUrls.add(cached); self._renderImage(cached, alt); return; }
      }

      var exclude = new Set();
      if (forceRefresh && self._currentUrl) { exclude.add(self._currentUrl); cacheDel(query); }

      findImageViaProxy(query, exclude).then(function(url) {
        if (url) { self._currentUrl = url; _usedUrls.add(url); cacheSet(query, url); self._renderImage(url, alt); }
        else { self._renderFallback(query); }
      });
    }

    _renderImage(url, alt) {
      var self = this;
      this.innerHTML = '';
      var img = document.createElement('img');
      img.src = url; img.alt = alt; img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() { self._renderFallback(self._query); };
      this.appendChild(img);
      var btn = document.createElement('button');
      btn.innerHTML = REFRESH_SVG; btn.title = 'Load different image';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:2;width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;background:rgba(0,0,0,0.45);color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;backdrop-filter:blur(4px);';
      btn.onmouseenter = function() { btn.style.opacity = '1'; };
      this.onmouseenter = function() { btn.style.opacity = '0.7'; };
      this.onmouseleave = function() { btn.style.opacity = '0'; };
      btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); self._loadImage(true); };
      this.appendChild(btn);
    }

    _renderFallback(query) {
      var self = this;
      var colors = [['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#a18cd1','#fbc2eb']];
      var pair = colors[Math.abs(this._hash(query)) % colors.length];
      this.style.background = 'linear-gradient(135deg, ' + pair[0] + ', ' + pair[1] + ')';
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,0.7);padding:12px;text-align:center;word-break:break-word;">' + query + '</div>';
      var btn = document.createElement('button');
      btn.innerHTML = REFRESH_SVG; btn.title = 'Retry image search';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:2;width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,0.25);color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;backdrop-filter:blur(4px);';
      this.onmouseenter = function() { btn.style.opacity = '0.7'; };
      this.onmouseleave = function() { btn.style.opacity = '0'; };
      btn.onmouseenter = function() { btn.style.opacity = '1'; };
      btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); cacheDel(query); self._loadImage(true); };
      this.appendChild(btn);
    }

    _hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
  }

  customElements.define('inf-image', InfImage);
})();
`;
  }

  // Web mode: bake keys directly into the script (original behavior)
  const config = getConfig();
  const pixabayKey = config.pixabayApiKey || "";
  const pexelsKey = config.pexelsApiKey || "";
  const unsplashKey = config.unsplashAccessKey || "";

  // The entire Web Component is a plain JS string for injection via doc.write()
  return `
(function() {
  if (customElements.get('inf-image')) return;

  var PIXABAY_KEY = ${JSON.stringify(pixabayKey)};
  var PEXELS_KEY = ${JSON.stringify(pexelsKey)};
  var UNSPLASH_KEY = ${JSON.stringify(unsplashKey)};
  var HAS_ANY_KEY = !!(PIXABAY_KEY || PEXELS_KEY || UNSPLASH_KEY);

  var CACHE_PREFIX = 'inf-img-';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Page-level dedup: track URLs already used on this page to avoid repeats
  var _usedUrls = new Set();

  function cacheGet(query) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + query);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + query); return null; }
      return data.url;
    } catch(e) { return null; }
  }

  function cacheSet(query, url) {
    try {
      localStorage.setItem(CACHE_PREFIX + query, JSON.stringify({ url: url, ts: Date.now() }));
    } catch(e) { /* full */ }
  }

  function cacheDel(query) {
    try { localStorage.removeItem(CACHE_PREFIX + query); } catch(e) {}
  }

  // Pick best non-duplicate URL from an array of candidates
  function pickBest(urls) {
    // Prefer one not yet used on this page
    for (var i = 0; i < urls.length; i++) {
      if (!_usedUrls.has(urls[i])) return urls[i];
    }
    // All used — just return first
    return urls.length > 0 ? urls[0] : null;
  }

  function searchPixabay(query, count) {
    if (!PIXABAY_KEY) return Promise.resolve([]);
    var url = 'https://pixabay.com/api/?key=' + PIXABAY_KEY + '&q=' + encodeURIComponent(query) + '&image_type=photo&per_page=' + count + '&safesearch=true';
    return fetch(url, { signal: AbortSignal.timeout(6000) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.hits && d.hits.length > 0) return d.hits.map(function(h) { return h.webformatURL; });
        return [];
      })
      .catch(function() { return []; });
  }

  function searchPexels(query, count) {
    if (!PEXELS_KEY) return Promise.resolve([]);
    return fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=' + count + '&orientation=landscape', {
      headers: { Authorization: PEXELS_KEY },
      signal: AbortSignal.timeout(6000)
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.photos && d.photos.length > 0) return d.photos.map(function(p) { return p.src.large; });
        return [];
      })
      .catch(function() { return []; });
  }

  function searchUnsplash(query, count) {
    if (!UNSPLASH_KEY) return Promise.resolve([]);
    return fetch('https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=' + count + '&orientation=landscape', {
      headers: { Authorization: 'Client-ID ' + UNSPLASH_KEY },
      signal: AbortSignal.timeout(6000)
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.results && d.results.length > 0) return d.results.map(function(r) { return r.urls.regular; });
        return [];
      })
      .catch(function() { return []; });
  }

  async function findImage(query, excludeUrls) {
    var exclude = excludeUrls || new Set();
    var combined = new Set(exclude);
    // Also exclude page-level used URLs
    _usedUrls.forEach(function(u) { combined.add(u); });

    // Try providers in order, return first non-excluded match
    var urls = await searchPixabay(query, 5);
    var filtered = urls.filter(function(u) { return !combined.has(u); });
    if (filtered.length > 0) return filtered[0];
    if (urls.length > 0 && filtered.length === 0) {
      // All pixabay results excluded, still try others before falling back
    }

    urls = await searchPexels(query, 5);
    filtered = urls.filter(function(u) { return !combined.has(u); });
    if (filtered.length > 0) return filtered[0];

    urls = await searchUnsplash(query, 5);
    filtered = urls.filter(function(u) { return !combined.has(u); });
    if (filtered.length > 0) return filtered[0];

    // Nothing new — return any first result from any provider
    return null;
  }

  // Refresh button SVG (circular arrow)
  var REFRESH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"/><path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14"/></svg>';

  class InfImage extends HTMLElement {
    connectedCallback() {
      var self = this;
      this._query = this.getAttribute('query') || '';
      this._aspect = this.getAttribute('aspect') || '16/9';
      this._alt = this.getAttribute('alt') || this._query;
      this._currentUrl = null;

      if (!this._query) return;

      // Container styles
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.style.borderRadius = this.style.borderRadius || '0.5rem';
      this.style.aspectRatio = this._aspect;
      this.style.width = this.style.width || '100%';

      // No API keys configured — show clickable prompt
      if (!HAS_ANY_KEY) {
        this.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';
        this.style.cursor = 'pointer';
        this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:16px;">'
          + '<div style="font-size:28px;opacity:0.5;">🖼️</div>'
          + '<div style="font-size:12px;color:rgba(99,102,241,0.7);text-align:center;line-height:1.4;max-width:80%;">'
          + '<div style="font-weight:600;margin-bottom:2px;">Click to configure image keys</div>'
          + '<div style="font-size:10px;opacity:0.7;">' + this._query + '</div>'
          + '</div>'
          + '</div>';
        this.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'open-image-settings' }, '*');
        };
        return;
      }

      this._loadImage(false);
    }

    _loadImage(forceRefresh) {
      var self = this;
      var query = this._query;
      var alt = this._alt;

      this.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';

      // Shimmer placeholder
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;">'
        + '<div style="width:32px;height:32px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:inf-img-spin 0.8s linear infinite;"></div>'
        + '<div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:80%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + query + '</div>'
        + '</div>'
        + '<style>@keyframes inf-img-spin{to{transform:rotate(360deg)}}</style>';

      if (!forceRefresh) {
        var cached = cacheGet(query);
        if (cached) {
          self._currentUrl = cached;
          _usedUrls.add(cached);
          self._renderImage(cached, alt);
          return;
        }
      }

      // Build exclude set for refresh: exclude current URL
      var exclude = new Set();
      if (forceRefresh && self._currentUrl) {
        exclude.add(self._currentUrl);
        cacheDel(query);
      }

      findImage(query, exclude).then(function(url) {
        if (url) {
          self._currentUrl = url;
          _usedUrls.add(url);
          cacheSet(query, url);
          self._renderImage(url, alt);
        } else {
          self._renderFallback(query);
        }
      });
    }

    _renderImage(url, alt) {
      var self = this;
      this.innerHTML = '';
      var img = document.createElement('img');
      img.src = url;
      img.alt = alt;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() { self._renderFallback(self._query); };
      this.appendChild(img);

      // Refresh button — only visible on hover
      var btn = document.createElement('button');
      btn.innerHTML = REFRESH_SVG;
      btn.title = 'Load different image';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:2;'
        + 'width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;'
        + 'background:rgba(0,0,0,0.45);color:#fff;'
        + 'display:flex;align-items:center;justify-content:center;'
        + 'opacity:0;transition:opacity 0.2s;backdrop-filter:blur(4px);';
      btn.onmouseenter = function() { btn.style.opacity = '1'; };

      // Show button on container hover, hide on leave
      this.onmouseenter = function() { btn.style.opacity = '0.7'; };
      this.onmouseleave = function() { btn.style.opacity = '0'; };

      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        self._loadImage(true);
      };
      this.appendChild(btn);
    }

    _renderFallback(query) {
      var self = this;
      var colors = [
        ['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],
        ['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#a18cd1','#fbc2eb']
      ];
      var pair = colors[Math.abs(this._hash(query)) % colors.length];
      this.style.background = 'linear-gradient(135deg, ' + pair[0] + ', ' + pair[1] + ')';
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,0.7);padding:12px;text-align:center;word-break:break-word;">'
        + query + '</div>';

      // Refresh button on fallback too
      var btn = document.createElement('button');
      btn.innerHTML = REFRESH_SVG;
      btn.title = 'Retry image search';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:2;'
        + 'width:28px;height:28px;border-radius:50%;border:none;cursor:pointer;'
        + 'background:rgba(255,255,255,0.25);color:#fff;'
        + 'display:flex;align-items:center;justify-content:center;'
        + 'opacity:0;transition:opacity 0.2s;backdrop-filter:blur(4px);';
      this.onmouseenter = function() { btn.style.opacity = '0.7'; };
      this.onmouseleave = function() { btn.style.opacity = '0'; };
      btn.onmouseenter = function() { btn.style.opacity = '1'; };
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        cacheDel(query);
        self._loadImage(true);
      };
      this.appendChild(btn);
    }

    _hash(s) {
      var h = 0;
      for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
      return h;
    }
  }

  customElements.define('inf-image', InfImage);
})();
`;
}
