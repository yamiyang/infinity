"use client";

import { getConfig } from "./config";

/**
 * Build the <inf-image> Web Component script to inject into iframes.
 * Reads API keys from config at injection time and bakes them into the script.
 */
export function buildImageComponentScript(): string {
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

  function searchPixabay(query) {
    if (!PIXABAY_KEY) return Promise.resolve(null);
    var url = 'https://pixabay.com/api/?key=' + PIXABAY_KEY + '&q=' + encodeURIComponent(query) + '&image_type=photo&per_page=3&safesearch=true';
    return fetch(url, { signal: AbortSignal.timeout(6000) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.hits && d.hits.length > 0) return d.hits[0].webformatURL;
        return null;
      })
      .catch(function() { return null; });
  }

  function searchPexels(query) {
    if (!PEXELS_KEY) return Promise.resolve(null);
    return fetch('https://api.pexels.com/v1/search?query=' + encodeURIComponent(query) + '&per_page=3&orientation=landscape', {
      headers: { Authorization: PEXELS_KEY },
      signal: AbortSignal.timeout(6000)
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.photos && d.photos.length > 0) return d.photos[0].src.large;
        return null;
      })
      .catch(function() { return null; });
  }

  function searchUnsplash(query) {
    if (!UNSPLASH_KEY) return Promise.resolve(null);
    return fetch('https://api.unsplash.com/search/photos?query=' + encodeURIComponent(query) + '&per_page=3&orientation=landscape', {
      headers: { Authorization: 'Client-ID ' + UNSPLASH_KEY },
      signal: AbortSignal.timeout(6000)
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.results && d.results.length > 0) return d.results[0].urls.regular;
        return null;
      })
      .catch(function() { return null; });
  }

  async function findImage(query) {
    var url = await searchPixabay(query);
    if (url) return url;
    url = await searchPexels(query);
    if (url) return url;
    url = await searchUnsplash(query);
    if (url) return url;
    return null;
  }

  class InfImage extends HTMLElement {
    connectedCallback() {
      var self = this;
      var query = this.getAttribute('query') || '';
      var aspect = this.getAttribute('aspect') || '16/9';
      var alt = this.getAttribute('alt') || query;

      if (!query) return;

      // Container styles
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.style.borderRadius = this.style.borderRadius || '0.5rem';
      this.style.aspectRatio = aspect;
      this.style.width = this.style.width || '100%';

      // No API keys configured — show clickable prompt
      if (!HAS_ANY_KEY) {
        this.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';
        this.style.cursor = 'pointer';
        this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:16px;">'
          + '<div style="font-size:28px;opacity:0.5;">🖼️</div>'
          + '<div style="font-size:12px;color:rgba(99,102,241,0.7);text-align:center;line-height:1.4;max-width:80%;">'
          + '<div style="font-weight:600;margin-bottom:2px;">Click to configure image keys</div>'
          + '<div style="font-size:10px;opacity:0.7;">' + query + '</div>'
          + '</div>'
          + '</div>';
        this.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'open-image-settings' }, '*');
        };
        return;
      }

      this.style.background = 'linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%)';

      // Shimmer placeholder
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;">'
        + '<div style="width:32px;height:32px;border:2px solid rgba(99,102,241,0.2);border-top-color:rgba(99,102,241,0.6);border-radius:50%;animation:inf-img-spin 0.8s linear infinite;"></div>'
        + '<div style="font-size:11px;color:rgba(99,102,241,0.5);max-width:80%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + query + '</div>'
        + '</div>'
        + '<style>@keyframes inf-img-spin{to{transform:rotate(360deg)}}</style>';

      // Check cache
      var cached = cacheGet(query);
      if (cached) {
        self._renderImage(cached, alt);
        return;
      }

      // Search providers in order
      findImage(query).then(function(url) {
        if (url) {
          cacheSet(query, url);
          self._renderImage(url, alt);
        } else {
          self._renderFallback(query);
        }
      });
    }

    _renderImage(url, alt) {
      this.innerHTML = '';
      var img = document.createElement('img');
      img.src = url;
      img.alt = alt;
      img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() { this.parentElement._renderFallback(this.alt); }.bind(img);
      this.appendChild(img);
    }

    _renderFallback(query) {
      var colors = [
        ['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],
        ['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#a18cd1','#fbc2eb']
      ];
      var pair = colors[Math.abs(this._hash(query)) % colors.length];
      this.style.background = 'linear-gradient(135deg, ' + pair[0] + ', ' + pair[1] + ')';
      this.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,0.7);padding:12px;text-align:center;word-break:break-word;">'
        + query + '</div>';
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
