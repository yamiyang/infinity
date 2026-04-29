import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { configure, getConfig, getRequestFn, getSystemPrompt, streamLLM } from "./stream";
import { SYSTEM_PROMPT } from "./prompt";
import type { AIComponentsConfig } from "./types";

describe("stream", () => {
  beforeEach(() => {
    // Reset global state
    delete window.__ai_components;
    // We need to reset the module-level _config.
    // Since we can't directly, we reconfigure each time.
  });

  afterEach(() => {
    delete window.__ai_components;
  });

  // ── configure / getConfig ─────────────────────────────────────

  describe("configure", () => {
    it("stores config and sets window.__ai_components", () => {
      const mockFn = vi.fn();
      configure({ request: mockFn });

      expect(getConfig()).toBeDefined();
      expect(getConfig()!.request).toBe(mockFn);
      expect(window.__ai_components).toBeDefined();
      expect(window.__ai_components!.request).toBe(mockFn);
    });

    it("supports custom system prompt", () => {
      const mockFn = vi.fn();
      configure({ request: mockFn, systemPrompt: "custom prompt" });

      expect(getSystemPrompt()).toBe("custom prompt");
    });
  });

  // ── getRequestFn ──────────────────────────────────────────────

  describe("getRequestFn", () => {
    it("throws if not configured", () => {
      // Force clear config by configuring with a null-ish request
      // We need to test the unconfigured state.
      // Since configure sets module-level _config, we need a fresh import.
      // For this test, we rely on the fact that window.__ai_components is deleted.
      // However, the module-level _config may persist.
      // Let's reconfigure and then test.
      expect(() => {
        // Reset by setting config without request
        configure(null as unknown as AIComponentsConfig);
        getRequestFn();
      }).toThrow("[ai-components]");
    });

    it("returns the configured request function", () => {
      const mockFn = vi.fn();
      configure({ request: mockFn });

      expect(getRequestFn()).toBe(mockFn);
    });
  });

  // ── getSystemPrompt ───────────────────────────────────────────

  describe("getSystemPrompt", () => {
    it("returns built-in prompt when no custom prompt configured", () => {
      const mockFn = vi.fn();
      configure({ request: mockFn });

      expect(getSystemPrompt()).toBe(SYSTEM_PROMPT);
    });

    it("returns custom prompt when configured", () => {
      const mockFn = vi.fn();
      configure({ request: mockFn, systemPrompt: "my prompt" });

      expect(getSystemPrompt()).toBe("my prompt");
    });
  });

  // ── streamLLM ─────────────────────────────────────────────────

  describe("streamLLM", () => {
    it("yields chunks from the request function", async () => {
      async function* mockRequest(prompt: string) {
        yield "<div>";
        yield "hello";
        yield "</div>";
      }

      configure({ request: mockRequest });

      const chunks: string[] = [];
      for await (const chunk of streamLLM("test prompt")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["<div>", "hello", "</div>"]);
    });

    it("passes prompt and options to request function", async () => {
      const receivedArgs: Array<{ prompt: string; systemPrompt?: string }> = [];

      async function* mockRequest(
        prompt: string,
        options?: { signal?: AbortSignal; systemPrompt?: string },
      ) {
        receivedArgs.push({ prompt, systemPrompt: options?.systemPrompt });
        yield "ok";
      }

      configure({ request: mockRequest });

      const chunks: string[] = [];
      for await (const chunk of streamLLM("hello world")) {
        chunks.push(chunk);
      }

      expect(receivedArgs).toHaveLength(1);
      expect(receivedArgs[0].prompt).toBe("hello world");
      expect(receivedArgs[0].systemPrompt).toBe(SYSTEM_PROMPT);
    });

    it("stops yielding when signal is aborted", async () => {
      const controller = new AbortController();

      async function* mockRequest() {
        yield "chunk1";
        yield "chunk2";
        controller.abort(); // Abort after 2 chunks
        yield "chunk3"; // This should be skipped
      }

      configure({ request: mockRequest });

      const chunks: string[] = [];
      for await (const chunk of streamLLM("test", controller.signal)) {
        chunks.push(chunk);
      }

      // chunk3 should not appear (aborted before yielding it)
      expect(chunks.length).toBeLessThanOrEqual(2);
    });

    it("propagates errors from request function", async () => {
      async function* mockRequest() {
        yield "ok";
        throw new Error("LLM error");
      }

      configure({ request: mockRequest });

      const chunks: string[] = [];
      await expect(async () => {
        for await (const chunk of streamLLM("test")) {
          chunks.push(chunk);
        }
      }).rejects.toThrow("LLM error");

      expect(chunks).toEqual(["ok"]);
    });
  });
});
