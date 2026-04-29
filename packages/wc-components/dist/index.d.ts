declare abstract class WCBase extends HTMLElement {
    /** Unique component instance id */
    protected _compId: string;
    /** Component type identifier (e.g., "content", "table", "card") */
    protected abstract readonly componentType: string;
    /** Rendering state */
    private _buffer;
    private _started;
    private _contentEl;
    private _rafId;
    private _needsRender;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _onToken;
    private _onDone;
    private _onError;
    private _doRender;
    private _scheduleRender;
    private _showLoading;
    /** Collect extra attributes as meta for specialized components */
    protected _collectMeta(): Record<string, string>;
}

declare class WCContent extends WCBase {
    protected readonly componentType = "content";
}
declare function defineWCContent(): void;

declare class WCTable extends WCBase {
    protected readonly componentType = "table";
}
declare function defineWCTable(): void;

declare class WCCard extends WCBase {
    protected readonly componentType = "card";
}
declare function defineWCCard(): void;

declare class WCList extends WCBase {
    protected readonly componentType = "list";
}
declare function defineWCList(): void;

declare class WCChart extends WCBase {
    protected readonly componentType = "chart";
}
declare function defineWCChart(): void;

declare class WCForm extends WCBase {
    protected readonly componentType = "form";
}
declare function defineWCForm(): void;

declare class WCHero extends WCBase {
    protected readonly componentType = "hero";
}
declare function defineWCHero(): void;

declare class WCFAQ extends WCBase {
    protected readonly componentType = "faq";
}
declare function defineWCFAQ(): void;

declare class WCTimeline extends WCBase {
    protected readonly componentType = "timeline";
}
declare function defineWCTimeline(): void;

declare class WCCode extends WCBase {
    protected readonly componentType = "code";
}
declare function defineWCCode(): void;

/** LLM provider configuration */
interface WCConfig {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
/** Provider preset definition */
interface WCPreset {
    id: string;
    name: string;
    icon: string;
    baseUrl: string;
    models: string[];
    defaultModel: string;
}
/** Streaming callback */
type OnToken = (token: string) => void;
/** Component message sent via postMessage to request generation */
interface WCGenerateMessage {
    type: "wc-generate";
    compId: string;
    query: string;
    style: string;
    componentType: string;
    meta?: Record<string, string>;
}
/** Component callback registry (attached to window) */
interface WCRegistry {
    _cbs: Record<string, {
        onToken: (token: string) => void;
        onDone: (html: string) => void;
        onError: (msg?: string) => void;
    }>;
    _active: number;
    token: (id: string, tk: string) => void;
    done: (id: string, html: string) => void;
    error: (id: string, msg?: string) => void;
}
/** Extend Window for the global registry */
declare global {
    interface Window {
        __wc?: WCRegistry;
        __wcConfig?: WCConfig;
    }
}

/** Get or create the global WC registry */
declare function getRegistry(): WCRegistry;
/** Generate a unique component ID */
declare function nextCompId(): string;

interface StreamRequest {
    config: WCConfig;
    messages: Array<{
        role: string;
        content: string;
    }>;
    onToken: OnToken;
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
}
/** Strip markdown code fences from LLM output */
declare function stripCodeFence(text: string): string;
/**
 * Stream content from an OpenAI-compatible API (direct browser call).
 * Uses raw fetch + ReadableStream — no SDK dependency.
 */
declare function streamContent(req: StreamRequest): Promise<string>;
/**
 * Stream content via an SSE proxy endpoint (for Electron / server-side key).
 */
declare function streamViaProxy(endpoint: string, messages: Array<{
    role: string;
    content: string;
}>, onToken: OnToken, signal?: AbortSignal, temperature?: number, maxTokens?: number): Promise<string>;

interface HostOptions {
    /** LLM configuration */
    config: WCConfig;
    /** Custom system prompt override (for all components) */
    systemPrompt?: string;
    /** Per-type system prompt overrides */
    prompts?: Partial<Record<string, string>>;
    /** SSE proxy endpoint (if using proxy mode instead of direct API) */
    proxyEndpoint?: string;
    /** Called when a component starts generating */
    onStart?: (compId: string, query: string) => void;
    /** Called when a component finishes */
    onDone?: (compId: string) => void;
    /** Called on error */
    onError?: (compId: string, error: Error) => void;
}
/**
 * Initialize the WC Host — listens for wc-generate messages and
 * streams LLM content back to components via iframe.__wc.token().
 *
 * @returns cleanup function to remove the listener
 */
declare function initWCHost(options: HostOptions): () => void;
/** Abort a specific component's generation */
declare function abortGeneration(compId: string): boolean;
/** Abort all running generations */
declare function abortAllGenerations(): void;

declare const PRESETS: WCPreset[];
/** Get a preset by id */
declare function getPreset(id: string): WCPreset | undefined;
/** Create a WCConfig from a preset id + apiKey */
declare function configFromPreset(presetId: string, apiKey: string): WCConfig;

/** Default system prompt for component content generation */
declare const COMPONENT_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.";
/** Table-specific prompt */
declare const TABLE_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a well-structured HTML <table> with <thead> and <tbody>.\n- Use Tailwind for striped rows and hover effects.\n- Make data realistic and informative.\n- Include proper column headers.";
/** Card grid prompt */
declare const CARD_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a grid of cards using CSS grid or flexbox.\n- Each card should have a title, description, and optional icon/emoji.\n- Use rounded corners, subtle shadows, and consistent spacing.\n- Make it responsive (stack on mobile).";
/** List prompt */
declare const LIST_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a styled list (ordered or unordered).\n- Use custom markers or numbers, not default browser bullets.\n- Each item should have clear visual hierarchy.\n- Add subtle spacing and hover effects.";
/** Chart/visualization prompt */
declare const CHART_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a data visualization using pure CSS and HTML.\n- Use CSS for bar charts, progress indicators, or stat displays.\n- Include labels, values, and visual indicators.\n- Use color to convey meaning. No JavaScript charting libraries.";
/** Form prompt */
declare const FORM_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate an HTML form with styled inputs.\n- Use proper labels, placeholders, and input types.\n- Style with Tailwind: focus rings, rounded inputs, spacing.\n- Include a submit button. Make it accessible.";
/** Hero section prompt */
declare const HERO_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a hero section with a compelling headline and subtext.\n- Use bold typography and gradient or solid backgrounds.\n- Include a call-to-action button.\n- Make it full-width and visually impactful.";
/** FAQ accordion prompt */
declare const FAQ_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate an FAQ section with <details>/<summary> elements.\n- Each Q&A pair is a collapsible <details>.\n- Style the summary as a question with arrow indicators.\n- Add smooth spacing and borders between items.";
/** Timeline prompt */
declare const TIMELINE_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a vertical timeline with events.\n- Use a central or left-aligned line with dots/circles for each event.\n- Each event has a date/time and description.\n- Alternate layout or consistent left-aligned.";
/** Code block prompt */
declare const CODE_SYSTEM_PROMPT = "You generate a self-contained HTML fragment (NOT a full page).\nRules:\n- Output ONLY the HTML fragment. No doctype, no <html>, no <head>, no <body>.\n- Use Tailwind CSS classes (assume CDN is loaded in parent).\n- Do NOT add <h1> / <h2> section headings \u2014 the parent page provides those.\n- Make content responsive and visually polished.\n- Use semantic HTML. Keep code concise.\n- If the user specifies a language, write content in that language.\n- If a style hint is given, follow it closely.\nAdditional: Generate a code example in a styled <pre><code> block.\n- Use a dark background with syntax-highlighted colors (manual, no JS lib).\n- Include line numbers if appropriate.\n- Add a language label and optional copy hint.";
/** Build the user message for component generation */
declare function buildUserMessage(query: string, styleHint?: string, lang?: string, extra?: string): string;

/**
 * Register all wc-* custom elements at once.
 * Call this once at app startup.
 */
declare function defineAll(): void;

export { CARD_SYSTEM_PROMPT, CHART_SYSTEM_PROMPT, CODE_SYSTEM_PROMPT, COMPONENT_SYSTEM_PROMPT, FAQ_SYSTEM_PROMPT, FORM_SYSTEM_PROMPT, HERO_SYSTEM_PROMPT, LIST_SYSTEM_PROMPT, type OnToken, PRESETS, TABLE_SYSTEM_PROMPT, TIMELINE_SYSTEM_PROMPT, WCBase, WCCard, WCChart, WCCode, type WCConfig, WCContent, WCFAQ, WCForm, type WCGenerateMessage, WCHero, WCList, type WCPreset, type WCRegistry, WCTable, WCTimeline, abortAllGenerations, abortGeneration, buildUserMessage, configFromPreset, defineAll, defineWCCard, defineWCChart, defineWCCode, defineWCContent, defineWCFAQ, defineWCForm, defineWCHero, defineWCList, defineWCTable, defineWCTimeline, getPreset, getRegistry, initWCHost, nextCompId, streamContent, streamViaProxy, stripCodeFence };
