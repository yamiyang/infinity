import { describe, it, expect, beforeEach } from "vitest";
import { IncrementalDOMBuilder, parseTag, parseAttributes } from "./dom-builder";

// ============================================================
// parseTag
// ============================================================

describe("parseTag", () => {
  it("parses an opening tag with no attributes", () => {
    expect(parseTag("<div>")).toEqual({
      type: "open",
      tag: "div",
      attrs: {},
    });
  });

  it("parses an opening tag with attributes", () => {
    expect(parseTag('<div class="foo" id="bar">')).toEqual({
      type: "open",
      tag: "div",
      attrs: { class: "foo", id: "bar" },
    });
  });

  it("parses single-quoted attributes", () => {
    expect(parseTag("<div class='foo'>")).toEqual({
      type: "open",
      tag: "div",
      attrs: { class: "foo" },
    });
  });

  it("parses unquoted attributes", () => {
    expect(parseTag("<input type=text>")).toEqual({
      type: "open",
      tag: "input",
      attrs: { type: "text" },
    });
  });

  it("parses boolean attributes", () => {
    expect(parseTag("<input disabled>")).toEqual({
      type: "open",
      tag: "input",
      attrs: { disabled: "" },
    });
  });

  it("parses self-closing tags", () => {
    expect(parseTag("<br/>")).toEqual({
      type: "open",
      tag: "br",
      attrs: {},
    });
  });

  it("parses self-closing tags with space", () => {
    expect(parseTag("<br />")).toEqual({
      type: "open",
      tag: "br",
      attrs: {},
    });
  });

  it("parses closing tags", () => {
    expect(parseTag("</div>")).toEqual({
      type: "close",
      tag: "div",
    });
  });

  it("parses closing tags with whitespace", () => {
    expect(parseTag("</div >")).toEqual({
      type: "close",
      tag: "div",
    });
  });

  it("returns null for HTML comments", () => {
    expect(parseTag("<!-- comment -->")).toBeNull();
  });

  it("returns null for doctype", () => {
    expect(parseTag("<!DOCTYPE html>")).toBeNull();
  });

  it("returns null for empty tag", () => {
    expect(parseTag("<>")).toBeNull();
  });

  it("handles tags with hyphens (custom elements)", () => {
    expect(parseTag("<my-component>")).toEqual({
      type: "open",
      tag: "my-component",
      attrs: {},
    });
  });

  it("handles tags with data- attributes", () => {
    expect(parseTag('<div data-value="123">')).toEqual({
      type: "open",
      tag: "div",
      attrs: { "data-value": "123" },
    });
  });
});

// ============================================================
// parseAttributes
// ============================================================

describe("parseAttributes", () => {
  it("parses empty string", () => {
    expect(parseAttributes("")).toEqual({});
  });

  it("parses mixed attribute styles", () => {
    expect(parseAttributes(' class="foo" id=\'bar\' disabled')).toEqual({
      class: "foo",
      id: "bar",
      disabled: "",
    });
  });

  it("parses attributes with special chars in values", () => {
    expect(parseAttributes(' style="color: red; font-size: 12px;"')).toEqual({
      style: "color: red; font-size: 12px;",
    });
  });

  it("strips trailing / for self-closing", () => {
    expect(parseAttributes(" /")).toEqual({});
  });

  it("parses multiple classes with spaces in value", () => {
    expect(parseAttributes(' class="foo bar baz"')).toEqual({
      class: "foo bar baz",
    });
  });
});

// ============================================================
// IncrementalDOMBuilder
// ============================================================

describe("IncrementalDOMBuilder", () => {
  let root: HTMLElement;
  let builder: IncrementalDOMBuilder;

  beforeEach(() => {
    root = document.createElement("div");
    builder = new IncrementalDOMBuilder(root);
  });

  // ── Basic element creation ──────────────────────────────────

  it("creates a simple element", () => {
    builder.write("<p>Hello</p>");
    builder.finish();

    expect(root.childNodes.length).toBe(1);
    const p = root.firstChild as HTMLElement;
    expect(p.tagName).toBe("P");
    expect(p.textContent).toBe("Hello");
  });

  it("creates nested elements", () => {
    builder.write("<div><span>nested</span></div>");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    const span = div.firstChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("nested");
  });

  it("creates sibling elements", () => {
    builder.write("<p>one</p><p>two</p>");
    builder.finish();

    expect(root.childNodes.length).toBe(2);
    expect((root.childNodes[0] as HTMLElement).textContent).toBe("one");
    expect((root.childNodes[1] as HTMLElement).textContent).toBe("two");
  });

  it("creates elements with attributes", () => {
    builder.write('<div class="foo" id="bar">content</div>');
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect(div.getAttribute("class")).toBe("foo");
    expect(div.getAttribute("id")).toBe("bar");
  });

  // ── Streaming (chunked input) ────────────────────────────────

  it("handles chunks splitting a tag", () => {
    builder.write("<di");
    builder.write('v class="foo"');
    builder.write(">hello</div>");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.getAttribute("class")).toBe("foo");
    expect(div.textContent).toBe("hello");
  });

  it("handles chunks splitting text content", () => {
    builder.write("<p>hel");
    builder.write("lo wor");
    builder.write("ld</p>");
    builder.finish();

    const p = root.firstChild as HTMLElement;
    expect(p.textContent).toBe("hello world");
  });

  it("handles single character chunks", () => {
    const html = "<b>hi</b>";
    for (const ch of html) {
      builder.write(ch);
    }
    builder.finish();

    const b = root.firstChild as HTMLElement;
    expect(b.tagName).toBe("B");
    expect(b.textContent).toBe("hi");
  });

  it("handles text before first tag", () => {
    builder.write("prefix text<p>content</p>");
    builder.finish();

    // First child should be text node "prefix text"
    expect(root.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(root.childNodes[0].textContent).toBe("prefix text");
    // Second child should be <p>
    expect((root.childNodes[1] as HTMLElement).tagName).toBe("P");
  });

  // ── Void elements ────────────────────────────────────────────

  it("handles void elements (br)", () => {
    builder.write("<p>line1<br>line2</p>");
    builder.finish();

    const p = root.firstChild as HTMLElement;
    expect(p.childNodes.length).toBe(3);
    expect(p.childNodes[0].textContent).toBe("line1");
    expect((p.childNodes[1] as HTMLElement).tagName).toBe("BR");
    expect(p.childNodes[2].textContent).toBe("line2");
  });

  it("handles void elements (hr)", () => {
    builder.write("<div><hr><p>after</p></div>");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect((div.childNodes[0] as HTMLElement).tagName).toBe("HR");
    expect((div.childNodes[1] as HTMLElement).tagName).toBe("P");
  });

  it("handles void elements with attributes", () => {
    builder.write('<img src="test.png" alt="test">');
    builder.finish();

    const img = root.firstChild as HTMLElement;
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("test.png");
    expect(img.getAttribute("alt")).toBe("test");
  });

  it("handles self-closing void elements", () => {
    builder.write("<br/>");
    builder.finish();

    expect((root.firstChild as HTMLElement).tagName).toBe("BR");
  });

  // ── Auto-close on finish ──────────────────────────────────────

  it("auto-closes unclosed tags on finish", () => {
    builder.write("<div><p>text");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    const p = div.firstChild as HTMLElement;
    expect(p.tagName).toBe("P");
    expect(p.textContent).toBe("text");
  });

  it("auto-closes deeply nested unclosed tags", () => {
    builder.write("<div><ul><li>item1</li><li>item2");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    const ul = div.firstChild as HTMLElement;
    expect(ul.tagName).toBe("UL");
    // Both li's should exist (second auto-closed by finish)
    expect(ul.childNodes.length).toBe(2);
    expect((ul.childNodes[0] as HTMLElement).textContent).toBe("item1");
    expect((ul.childNodes[1] as HTMLElement).textContent).toBe("item2");
  });

  // ── Tolerant parsing ──────────────────────────────────────────

  it("ignores unmatched closing tags", () => {
    builder.write("<p>text</p></span>");
    builder.finish();

    // The </span> should be silently ignored
    expect(root.childNodes.length).toBe(1);
    expect((root.firstChild as HTMLElement).tagName).toBe("P");
  });

  it("handles closing tags that skip levels (auto-close intermediate)", () => {
    builder.write("<div><p><span>text</div>");
    builder.finish();

    const div = root.firstChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    // The </div> should close both <span> and <p>
    const p = div.firstChild as HTMLElement;
    expect(p.tagName).toBe("P");
    const span = p.firstChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("text");
  });

  it("handles HTML comments by skipping them", () => {
    builder.write("<p>before<!-- comment -->after</p>");
    builder.finish();

    const p = root.firstChild as HTMLElement;
    expect(p.textContent).toBe("beforeafter");
  });

  // ── Complex realistic content ────────────────────────────────

  it("builds a realistic card layout", () => {
    const html =
      '<div class="grid grid-cols-2 gap-4">' +
      '<div class="bg-white rounded-xl p-4 shadow">' +
      "<h3>Card 1</h3>" +
      "<p>Description one</p>" +
      "</div>" +
      '<div class="bg-white rounded-xl p-4 shadow">' +
      "<h3>Card 2</h3>" +
      "<p>Description two</p>" +
      "</div>" +
      "</div>";

    builder.write(html);
    builder.finish();

    const grid = root.firstChild as HTMLElement;
    expect(grid.getAttribute("class")).toBe("grid grid-cols-2 gap-4");
    expect(grid.childNodes.length).toBe(2);

    const card1 = grid.childNodes[0] as HTMLElement;
    expect((card1.childNodes[0] as HTMLElement).textContent).toBe("Card 1");
    expect((card1.childNodes[1] as HTMLElement).textContent).toBe("Description one");
  });

  it("builds a table incrementally", () => {
    // Simulate streaming a table in chunks
    builder.write("<table><thead><tr>");
    builder.write("<th>Name</th>");
    builder.write("<th>Age</th>");
    builder.write("</tr></thead>");
    builder.write("<tbody>");
    builder.write("<tr><td>Alice</td><td>30</td></tr>");
    builder.write("<tr><td>Bob</td><td>25</td></tr>");
    builder.write("</tbody></table>");
    builder.finish();

    const table = root.firstChild as HTMLElement;
    expect(table.tagName).toBe("TABLE");

    const thead = table.firstChild as HTMLElement;
    expect(thead.tagName).toBe("THEAD");

    const tbody = table.childNodes[1] as HTMLElement;
    expect(tbody.tagName).toBe("TBODY");
    expect(tbody.childNodes.length).toBe(2);
  });

  // ── Incremental DOM (no flicker) ────────────────────────────

  it("does NOT replace existing nodes when new content arrives", () => {
    builder.write("<p>first</p>");

    const firstP = root.firstChild as HTMLElement;
    expect(firstP.tagName).toBe("P");

    // Write a second element — the first should stay intact
    builder.write("<p>second</p>");

    // The original <p> reference should still be the same node
    expect(root.firstChild).toBe(firstP);
    expect(root.childNodes.length).toBe(2);
    expect((root.childNodes[1] as HTMLElement).textContent).toBe("second");
  });

  it("appends to existing text nodes instead of creating new ones", () => {
    builder.write("hel");
    builder.write("lo");
    builder.finish();

    // Should merge into a single text node
    expect(root.childNodes.length).toBe(1);
    expect(root.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(root.childNodes[0].textContent).toBe("hello");
  });

  it("preserves existing DOM when streaming additional content", () => {
    builder.write('<div class="a">');
    builder.write("<p>paragraph 1</p>");

    const div = root.firstChild as HTMLElement;
    const p1 = div.firstChild as HTMLElement;
    const p1Ref = p1; // Keep reference

    builder.write("<p>paragraph 2</p>");

    // p1 should still be the same DOM node (not recreated)
    expect(div.firstChild).toBe(p1Ref);
    expect(div.childNodes.length).toBe(2);
  });

  // ── finish() behavior ────────────────────────────────────────

  it("ignores write() after finish()", () => {
    builder.write("<p>text</p>");
    builder.finish();

    builder.write("<p>more</p>");

    // Should still only have one child
    expect(root.childNodes.length).toBe(1);
  });

  it("handles finish() with incomplete tag in buffer", () => {
    builder.write("<p>text</p><di");
    builder.finish();

    // The incomplete <di should be discarded
    expect(root.childNodes.length).toBe(1);
    expect((root.firstChild as HTMLElement).tagName).toBe("P");
  });

  it("handles finish() with text-only buffer", () => {
    builder.write("just text");
    builder.finish();

    expect(root.childNodes.length).toBe(1);
    expect(root.textContent).toBe("just text");
  });

  // ── Edge cases ────────────────────────────────────────────────

  it("handles empty write", () => {
    builder.write("");
    builder.finish();

    expect(root.childNodes.length).toBe(0);
  });

  it("handles multiple empty writes", () => {
    builder.write("");
    builder.write("");
    builder.write("<p>ok</p>");
    builder.finish();

    expect(root.childNodes.length).toBe(1);
  });

  it("handles special characters in text", () => {
    builder.write("<p>a &amp; b &lt; c</p>");
    builder.finish();

    // Note: the builder doesn't decode entities — it passes raw text.
    // The browser will render &amp; as & when using innerHTML,
    // but we're creating text nodes which store raw text.
    const p = root.firstChild as HTMLElement;
    expect(p.textContent).toBe("a &amp; b &lt; c");
  });

  it("handles deeply nested structure", () => {
    builder.write(
      "<div><div><div><div><div><span>deep</span></div></div></div></div></div>"
    );
    builder.finish();

    let el: HTMLElement = root;
    for (let i = 0; i < 5; i++) {
      el = el.firstChild as HTMLElement;
      expect(el.tagName).toBe("DIV");
    }
    const span = el.firstChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("deep");
  });
});
