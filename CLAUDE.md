@AGENTS.md

# Infinity — Pure Frontend AI Exploration Engine

## Architecture
- **Pure frontend**: All LLM calls happen directly in the browser via OpenAI SDK (`dangerouslyAllowBrowser: true`)
- **No API routes**: No server-side logic. The Next.js app only provides client-side routing and static hosting.
- **Configuration**: API keys stored in browser localStorage via Settings modal (`src/lib/config.ts`)
- **Caching**: All page data cached in localStorage (`src/lib/client-store.ts`)

## Key Files
- `src/lib/config.ts` — Frontend config management (API keys, model settings)
- `src/lib/openai.ts` — Browser-side OpenAI streaming + completion
- `src/lib/tools.ts` — Browser-side search/images/news/data fetching (Serper API + LLM fallback)
- `src/lib/prompt.ts` — System prompt + user prompt builder
- `src/lib/client-store.ts` — localStorage page cache + tree structure
- `src/components/SettingsModal.tsx` — API key configuration UI
