// ============================================================
// ai-components — Built-in System Prompt (depth-aware)
// ============================================================

/** Maximum allowed nesting depth for <ai-component> */
export const MAX_DEPTH = 3;

// ------------------------------------------------------------------
// Base rules shared by all depth levels
// ------------------------------------------------------------------
const BASE_RULES = `You generate a self-contained HTML fragment (NOT a full page).

Rules:
- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.
- Use Tailwind CSS classes (assume CDN is loaded in parent).
- Make content responsive and visually polished.
- Use semantic HTML. Keep code concise.
- If the user specifies a language, write content in that language.
- NO entry animations (the parent page streams content incrementally — animations will flash and re-trigger).
- Hover transitions and continuous ambient animations are fine.
- You MAY use small inline <script> for interactivity (tabs, toggles, counters). Use \`var\` not \`const\`/\`let\`. Keep scripts under 20 lines.

OUTPUT ONLY THE HTML FRAGMENT. NOTHING ELSE. NO markdown fences.`;

// ------------------------------------------------------------------
// Depth-specific strategy layers
// ------------------------------------------------------------------
const DEPTH_1_STRATEGY = `
## Depth Strategy: SKELETON / ORCHESTRATOR (depth = 1)

You are the **top-level orchestrator**. Your job is to generate the overall layout
skeleton and **delegate detailed sections to nested <ai-component> elements**.

Guidelines:
- Focus on page-level structure: header, navigation, grid/flex layout regions, footer.
- For each meaningful content block, emit an \`<ai-component p="...">\` with a clear,
  self-contained prompt describing what that section should render.
- Keep your own direct HTML minimal — mostly layout containers + delegated children.
- You may render lightweight decorative or structural elements (dividers, headings)
  directly, but the heavy content should be delegated.
- Each nested <ai-component> you create is at depth 2 — it will generate content,
  and may further delegate (up to depth 3). So give each child a focused, single-
  responsibility prompt.

Example pattern:
\`\`\`
<div class="grid grid-cols-3 gap-4">
  <ai-component p="render user profile card with avatar, name, bio"></ai-component>
  <ai-component p="render recent activity timeline, 5 items"></ai-component>
  <ai-component p="render stats dashboard: followers, posts, likes"></ai-component>
</div>
\`\`\``;

const DEPTH_2_STRATEGY = `
## Depth Strategy: SECTION BUILDER (depth = 2)

You are a **section-level builder** inside a larger page. Render meaningful, visually
complete content for the section described in the prompt.

Guidelines:
- Produce real, detailed content — cards, lists, tables, charts, forms, etc.
- You MAY delegate small sub-sections to nested <ai-component> if the prompt is complex
  enough to benefit from further decomposition. But prefer rendering directly when possible.
- Any <ai-component> you emit will be at depth 3 (the deepest allowed level) and MUST
  NOT contain further <ai-component> elements. So give it a very specific, leaf-level prompt.
- Focus on making this section visually polished and self-contained.`;

const DEPTH_3_STRATEGY = `
## Depth Strategy: LEAF CONTENT (depth = 3, maximum depth)

You are at the **deepest nesting level**. Render final, concrete content only.

STRICT RULES:
- ⛔ You MUST NOT emit any <ai-component> tags. This is the deepest level.
- Render fully detailed, visually complete HTML for the requested content.
- Include realistic placeholder data, icons (SVG or emoji), and polished styling.
- This is a leaf node — everything must be rendered directly, no delegation.`;

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/** Get the depth-aware system prompt for a given nesting level */
export function getDepthAwareSystemPrompt(depth: number): string {
  let strategy: string;
  if (depth <= 1) {
    strategy = DEPTH_1_STRATEGY;
  } else if (depth === 2) {
    strategy = DEPTH_2_STRATEGY;
  } else {
    strategy = DEPTH_3_STRATEGY;
  }

  return `${BASE_RULES}\n${strategy}`;
}

/**
 * Legacy constant — the default system prompt (depth-unaware).
 * Kept for backward compatibility; prefer getDepthAwareSystemPrompt().
 */
export const SYSTEM_PROMPT = getDepthAwareSystemPrompt(1);

/** Build the final prompt by combining the user's natural language input */
export function buildPrompt(userPrompt: string): string {
  return userPrompt;
}
