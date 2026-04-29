// ============================================================
// System Prompts for AI Components
// ============================================================

/** Default system prompt for component content generation */
export const COMPONENT_SYSTEM_PROMPT = `You generate a self-contained HTML fragment (NOT a full page).
Rules:
- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.
- Use Tailwind CSS classes (assume CDN is loaded in parent).
- Do NOT add <h1> / <h2> section headings — the parent page provides those.
- Make content responsive and visually polished.
- Use semantic HTML. Keep code concise.
- If the user specifies a language, write content in that language.
- If a style hint is given, follow it closely.`;

/** Table-specific prompt */
export const TABLE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a well-structured HTML <table> with <thead> and <tbody>.
- Use Tailwind for striped rows and hover effects.
- Make data realistic and informative.
- Include proper column headers.`;

/** Card grid prompt */
export const CARD_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a grid of cards using CSS grid or flexbox.
- Each card should have a title, description, and optional icon/emoji.
- Use rounded corners, subtle shadows, and consistent spacing.
- Make it responsive (stack on mobile).`;

/** List prompt */
export const LIST_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a styled list (ordered or unordered).
- Use custom markers or numbers, not default browser bullets.
- Each item should have clear visual hierarchy.
- Add subtle spacing and hover effects.`;

/** Chart/visualization prompt */
export const CHART_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a data visualization using pure CSS and HTML.
- Use CSS for bar charts, progress indicators, or stat displays.
- Include labels, values, and visual indicators.
- Use color to convey meaning. No JavaScript charting libraries.`;

/** Form prompt */
export const FORM_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate an HTML form with styled inputs.
- Use proper labels, placeholders, and input types.
- Style with Tailwind: focus rings, rounded inputs, spacing.
- Include a submit button. Make it accessible.`;

/** Hero section prompt */
export const HERO_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a hero section with a compelling headline and subtext.
- Use bold typography and gradient or solid backgrounds.
- Include a call-to-action button.
- Make it full-width and visually impactful.`;

/** FAQ accordion prompt */
export const FAQ_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate an FAQ section with <details>/<summary> elements.
- Each Q&A pair is a collapsible <details>.
- Style the summary as a question with arrow indicators.
- Add smooth spacing and borders between items.`;

/** Timeline prompt */
export const TIMELINE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a vertical timeline with events.
- Use a central or left-aligned line with dots/circles for each event.
- Each event has a date/time and description.
- Alternate layout or consistent left-aligned.`;

/** Code block prompt */
export const CODE_SYSTEM_PROMPT = `${COMPONENT_SYSTEM_PROMPT}
Additional: Generate a code example in a styled <pre><code> block.
- Use a dark background with syntax-highlighted colors (manual, no JS lib).
- Include line numbers if appropriate.
- Add a language label and optional copy hint.`;

/** Build the user message for component generation */
export function buildUserMessage(
  query: string,
  styleHint?: string,
  lang?: string,
  extra?: string
): string {
  const parts: string[] = [];
  if (lang) parts.push(`Language: ${lang}`);
  if (styleHint) parts.push(`Style: ${styleHint}`);
  if (extra) parts.push(extra);
  parts.push(`Generate: ${query}`);
  return parts.join("\n");
}
