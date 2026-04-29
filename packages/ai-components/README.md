# ai-components

> **Natural-language-driven Web Components powered by LLM.** Drop `<wc-content>`, `<wc-table>`, `<wc-card>` into any HTML — framework-free, zero dependencies.

## Features

- 🏷️ **Pure Web Components** — works in any framework (React, Vue, Svelte, vanilla HTML)
- 🗣️ **Natural language as attributes** — `<wc-table query="对比 React 和 Vue">` 
- 🌊 **Streaming rendering** — content appears token-by-token via rAF batching
- 📦 **10 component types** — content, table, card, list, chart, form, hero, faq, timeline, code
- 🔌 **Dual mode** — direct API call OR postMessage delegation (for iframe sandboxing)
- 💉 **Injectable** — `buildWCScript()` returns a plain JS string for `doc.write()` injection
- 🏢 **7 LLM presets** — OpenAI, DeepSeek, Claude, Gemini, Qwen, Doubao, GLM
- 🪶 **Zero dependencies** — pure DOM APIs, no React/Vue/SDK required

## Install

```bash
npm install ai-components
# or
pnpm add ai-components
```

## Usage

### Mode 1: Direct `<script>` tag (simplest)

```html
<script src="https://unpkg.com/ai-components/dist/ai-components.iife.js"></script>

<!-- All wc-* tags are now available -->
<wc-content query="量子计算的简要介绍" comp-style="light, indigo"></wc-content>
<wc-table query="对比 React、Vue、Angular"></wc-table>
<wc-card query="6 个热门旅游景点" cols="3"></wc-card>
```

### Mode 2: ESM import (npm)

```js
import { defineAll, initWCHost, configFromPreset } from "ai-components";

// Register all <wc-*> custom elements
defineAll();

// Start the host to handle LLM generation requests
const cleanup = initWCHost({
  config: configFromPreset("deepseek", "sk-your-key"),
});
```

### Mode 3: Inject into iframe (like Infinity)

```js
import { buildWCScript } from "ai-components/inject";
import { initWCHost, configFromPreset } from "ai-components";

// Parent frame: listen for component requests
initWCHost({
  config: configFromPreset("openai", "sk-..."),
});

// Inject into iframe
const iframe = document.querySelector("iframe");
const doc = iframe.contentDocument;
doc.open();
doc.write(`
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>${buildWCScript()}<\/script>
  <wc-content query="Hello from AI!"></wc-content>
`);
doc.close();
```

## Components

### `<wc-content>` — General content

```html
<wc-content query="History of the internet in 5 milestones" comp-style="blue, modern"></wc-content>
```

### `<wc-table>` — Data tables

```html
<wc-table query="Nutritional comparison of 8 fruits" columns="5" sortable="true"></wc-table>
```

### `<wc-card>` — Card grids

```html
<wc-card query="4 pricing tiers: Free, Pro, Team, Enterprise" cols="4" count="4"></wc-card>
```

### `<wc-list>` — Styled lists

```html
<wc-list query="10 best practices for REST API design" ordered="true" max-items="10"></wc-list>
```

### `<wc-chart>` — Data visualizations

```html
<wc-chart query="Browser market share: Chrome 65%, Safari 18%" chart-type="bar"></wc-chart>
```

### `<wc-form>` — Interactive forms

```html
<wc-form query="User registration: name, email, password" layout="vertical"></wc-form>
```

### `<wc-hero>` — Hero sections

```html
<wc-hero query="Next-gen AI platform" comp-style="gradient purple to blue"></wc-hero>
```

### `<wc-faq>` — FAQ accordions

```html
<wc-faq query="Common TypeScript questions" count="6"></wc-faq>
```

### `<wc-timeline>` — Timelines

```html
<wc-timeline query="JavaScript evolution: 1995 to 2024" comp-style="left-aligned, cyan"></wc-timeline>
```

### `<wc-code>` — Code examples

```html
<wc-code query="React useLocalStorage hook" language="typescript"></wc-code>
```

## Common Attributes (all components)

| Attribute | Description |
|-----------|-------------|
| `query` | **(required)** Natural language description of desired content |
| `comp-style` | Visual style hint for the LLM (e.g. "dark theme, rounded cards") |
| `aspect` | Aspect ratio (e.g. "16/9") |
| `lang` | Language hint (e.g. "zh-CN", "en") |

Each component also accepts its own specific attributes (e.g. `columns`, `sortable`, `cols`, `count`, `chart-type`, `layout`, `language`, etc.) which are forwarded as `meta` to the LLM.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Parent Frame                                           │
│                                                         │
│  initWCHost({ config })                                 │
│    ↕ postMessage("wc-generate")                         │
│    ↕ iframe.__wc.token() / .done() / .error()           │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  iframe (or same page)                              ││
│  │                                                     ││
│  │  <wc-content query="...">                           ││
│  │    → connectedCallback()                            ││
│  │    → shows loading shimmer                          ││
│  │    → postMessage to parent                          ││
│  │    → receives tokens via __wc.token()               ││
│  │    → rAF batched innerHTML rendering                ││
│  │    → final content on __wc.done()                   ││
│  │                                                     ││
│  │  <wc-table query="...">  (same pattern)             ││
│  │  <wc-card query="...">   (same pattern)             ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Extending: Custom Component Type

```js
import { WCBase } from "ai-components";

class WCPricing extends WCBase {
  get componentType() { return "pricing"; }
}

customElements.define("wc-pricing", WCPricing);

// Then in host, add a custom prompt:
initWCHost({
  config,
  prompts: {
    pricing: "Generate a pricing table with tiers, features, and CTA buttons..."
  }
});
```

## API Reference

### `defineAll()`
Register all 10 `<wc-*>` custom elements at once.

### `initWCHost(options)`
Start listening for `wc-generate` messages. Returns a cleanup function.

### `buildWCScript()`
Returns a self-contained JS string containing the full WC runtime — ready for `doc.write()` injection.

### `configFromPreset(presetId, apiKey)`
Create a `WCConfig` from a provider preset name.

### `streamContent(req)`
Low-level streaming function for direct OpenAI-compatible API calls.

### `abortGeneration(compId)` / `abortAllGenerations()`
Abort running generations.

## License

MIT
