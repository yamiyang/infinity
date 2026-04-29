import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AIComponent, defineAIComponent } from "./ai-component";
import { configure } from "../../core/stream";

// Register the custom element once
defineAIComponent();

/** Helper: create a mock async generator LLM request */
function mockLLM(chunks: string[]) {
  return async function* (_prompt: string) {
    for (const chunk of chunks) {
      yield chunk;
    }
  };
}

/** Helper: wait for all microtasks + macrotasks to settle */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("AIComponent (<ai-component>)", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    delete window.__ai_components;
  });

  it("is registered as a custom element", () => {
    expect(customElements.get("ai-component")).toBe(AIComponent);
  });

  it("does nothing without a p attribute", async () => {
    const el = document.createElement("ai-component");
    container.appendChild(el);
    await flush();

    // Should be empty (no loading shimmer, no content)
    expect(el.children.length).toBe(0);
  });

  it("shows loading state when p is set", async () => {
    configure({ request: mockLLM(["<p>content</p>"]) });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "generate something");
    container.appendChild(el);

    // On the very first tick, it should show loading
    // (We check immediate state before await)
    expect(el.querySelector("div")).toBeTruthy();
  });

  it("renders streamed HTML content using DOM builder", async () => {
    configure({
      request: mockLLM(["<div>", '<p class="text">', "Hello World", "</p>", "</div>"]),
    });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "say hello");
    container.appendChild(el);
    await flush();

    // Content should be rendered via DOM building
    const contentDiv = el.querySelector("div");
    expect(contentDiv).toBeTruthy();

    const p = el.querySelector("p");
    expect(p).toBeTruthy();
    expect(p!.textContent).toBe("Hello World");
    expect(p!.getAttribute("class")).toBe("text");
  });

  it("strips markdown code fences from LLM output", async () => {
    configure({
      request: mockLLM(["```html\n", "<p>content</p>", "\n```"]),
    });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "test");
    container.appendChild(el);
    await flush();

    const p = el.querySelector("p");
    expect(p).toBeTruthy();
    expect(p!.textContent).toBe("content");
  });

  it("shows error state on LLM failure", async () => {
    const failingRequest = async function* () {
      throw new Error("API rate limit exceeded");
    };

    configure({ request: failingRequest });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "fail");
    container.appendChild(el);
    await flush();

    expect(el.textContent).toContain("API rate limit exceeded");
  });

  it("shows empty state when no content is generated", async () => {
    configure({
      request: mockLLM(["   ", "  "]),
    });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "empty");
    container.appendChild(el);
    await flush();

    expect(el.textContent).toContain("No content generated");
  });

  it("cancels generation on disconnect", async () => {
    let abortSignal: AbortSignal | undefined;

    const slowRequest = async function* (
      _prompt: string,
      options?: { signal?: AbortSignal },
    ) {
      abortSignal = options?.signal;
      yield "<p>start</p>";
      // Simulate slow generation
      await new Promise((resolve) => setTimeout(resolve, 5000));
      yield "<p>end</p>";
    };

    configure({ request: slowRequest });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "slow");
    container.appendChild(el);

    // Wait a tick then disconnect
    await new Promise((r) => setTimeout(r, 10));
    el.remove();

    // The abort signal should have been triggered
    expect(abortSignal?.aborted).toBe(true);
  });

  it("builds DOM incrementally without replacing existing nodes", async () => {
    const controlledRequest = async function* () {
      const chunks = ["<ul>", "<li>item 1</li>", "<li>item 2</li>", "</ul>"];
      for (const chunk of chunks) {
        yield chunk;
        // Small delay to allow DOM updates
        await new Promise((r) => setTimeout(r, 5));
      }
    };

    configure({ request: controlledRequest });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "list");
    container.appendChild(el);

    await flush();

    // The final result should be a proper list
    const ul = el.querySelector("ul");
    expect(ul).toBeTruthy();
    const items = el.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("item 1");
    expect(items[1].textContent).toBe("item 2");
  });

  it("handles complex nested HTML structures", async () => {
    configure({
      request: mockLLM([
        '<div class="card">',
        '<h3 class="title">',
        "Title",
        "</h3>",
        '<div class="body">',
        "<p>Paragraph 1</p>",
        "<p>Paragraph 2</p>",
        '<img src="test.png" alt="test">',
        "</div>",
        "</div>",
      ]),
    });

    const el = document.createElement("ai-component");
    el.setAttribute("p", "card");
    container.appendChild(el);
    await flush();

    const card = el.querySelector(".card");
    expect(card).toBeTruthy();

    const title = el.querySelector(".title");
    expect(title).toBeTruthy();
    expect(title!.textContent).toBe("Title");

    const paragraphs = el.querySelectorAll("p");
    expect(paragraphs.length).toBe(2);

    const img = el.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toBe("test.png");
  });

  // ================================================================
  // Depth awareness tests
  // ================================================================

  it("sets data-depth=1 for top-level component", async () => {
    configure({ request: mockLLM(["<p>top</p>"]) });

    const el = document.createElement("ai-component") as AIComponent;
    el.setAttribute("p", "top-level");
    container.appendChild(el);
    await flush();

    expect(el.dataset.depth).toBe("1");
  });

  it("sets data-depth=2 for a component nested inside another ai-component", async () => {
    configure({ request: mockLLM(["<p>child</p>"]) });

    // Create outer ai-component (won't generate — no `p` attr)
    const outer = document.createElement("ai-component");
    container.appendChild(outer);

    // Create inner ai-component with prompt
    const inner = document.createElement("ai-component") as AIComponent;
    inner.setAttribute("p", "nested child");
    outer.appendChild(inner);
    await flush();

    expect(inner.dataset.depth).toBe("2");
  });

  it("sets data-depth=3 for a doubly-nested component", async () => {
    configure({ request: mockLLM(["<p>leaf</p>"]) });

    const l1 = document.createElement("ai-component");
    container.appendChild(l1);

    const l2 = document.createElement("ai-component");
    l1.appendChild(l2);

    const l3 = document.createElement("ai-component") as AIComponent;
    l3.setAttribute("p", "deep leaf");
    l2.appendChild(l3);
    await flush();

    expect(l3.dataset.depth).toBe("3");
  });

  it("blocks generation when depth exceeds MAX_DEPTH (3)", async () => {
    const requestSpy = vi.fn(mockLLM(["<p>should not appear</p>"]));
    configure({ request: requestSpy });

    const l1 = document.createElement("ai-component");
    container.appendChild(l1);
    const l2 = document.createElement("ai-component");
    l1.appendChild(l2);
    const l3 = document.createElement("ai-component");
    l2.appendChild(l3);

    // This is depth 4 — should be blocked
    const l4 = document.createElement("ai-component") as AIComponent;
    l4.setAttribute("p", "too deep");
    l3.appendChild(l4);
    await flush();

    // Should show error text, not generated content
    expect(l4.textContent).toContain("Max nesting depth");
    // LLM request should NOT have been called for this element
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it("passes depth to streamLLM which uses depth-aware system prompt", async () => {
    let capturedSystemPrompt = "";

    const captureRequest = async function* (
      _prompt: string,
      options?: { signal?: AbortSignal; systemPrompt?: string },
    ) {
      capturedSystemPrompt = options?.systemPrompt || "";
      yield "<p>ok</p>";
    };

    configure({ request: captureRequest });

    // Top-level (depth 1) should get orchestrator prompt
    const el1 = document.createElement("ai-component");
    el1.setAttribute("p", "top");
    container.appendChild(el1);
    await flush();

    expect(capturedSystemPrompt).toContain("SKELETON");
    expect(capturedSystemPrompt).toContain("ORCHESTRATOR");

    // Depth 2 should get section builder prompt
    capturedSystemPrompt = "";
    const outer = document.createElement("ai-component");
    container.appendChild(outer);
    const el2 = document.createElement("ai-component");
    el2.setAttribute("p", "section");
    outer.appendChild(el2);
    await flush();

    expect(capturedSystemPrompt).toContain("SECTION BUILDER");

    // Depth 3 should get leaf prompt
    capturedSystemPrompt = "";
    const o1 = document.createElement("ai-component");
    container.appendChild(o1);
    const o2 = document.createElement("ai-component");
    o1.appendChild(o2);
    const el3 = document.createElement("ai-component");
    el3.setAttribute("p", "leaf");
    o2.appendChild(el3);
    await flush();

    expect(capturedSystemPrompt).toContain("LEAF CONTENT");
    expect(capturedSystemPrompt).toContain("MUST NOT emit any <ai-component>");
  });
});
