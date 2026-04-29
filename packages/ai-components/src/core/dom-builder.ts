// ============================================================
// ai-components — Incremental DOM Builder
//
// Parses streaming HTML tokens and incrementally builds DOM
// using createElement / appendChild / createTextNode.
//
// Key design:
// - NO innerHTML replacement — avoids flicker and re-initialization
// - Recursive tree building: maintains a stack of open elements
// - Auto-closes unclosed tags when the stream ends
// - Handles self-closing tags (br, hr, img, input, etc.)
// - Buffers partial tags until they can be fully parsed
// ============================================================

/** HTML void elements that are self-closing (no closing tag needed) */
const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/** Parse result types */
type ParsedToken =
  | { type: "open"; tag: string; attrs: Record<string, string> }
  | { type: "close"; tag: string }
  | { type: "text"; text: string };

/**
 * IncrementalDOMBuilder
 *
 * Receives streaming HTML string chunks and builds DOM nodes
 * incrementally under a given root element.
 *
 * Usage:
 *   const builder = new IncrementalDOMBuilder(rootEl);
 *   for await (const chunk of stream) {
 *     builder.write(chunk);
 *   }
 *   builder.finish();
 */
export class IncrementalDOMBuilder {
  /** Root element to append content into */
  private _root: HTMLElement;

  /** Stack of open elements — top of stack is the current parent */
  private _stack: HTMLElement[];

  /** Buffer for incomplete tags across chunk boundaries */
  private _buffer: string;

  /** Whether finish() has been called */
  private _finished: boolean;

  constructor(root: HTMLElement) {
    this._root = root;
    this._stack = [root];
    this._buffer = "";
    this._finished = false;
  }

  /** Get the current parent element (top of stack) */
  private get _parent(): HTMLElement {
    return this._stack[this._stack.length - 1] || this._root;
  }

  /**
   * Feed a chunk of HTML text into the builder.
   * Processes complete tokens and buffers incomplete ones.
   */
  write(chunk: string): void {
    if (this._finished) return;
    this._buffer += chunk;
    this._processBuffer();
  }

  /**
   * Finalize the builder — auto-close any remaining open tags.
   * After calling finish(), subsequent write() calls are no-ops.
   */
  finish(): void {
    if (this._finished) return;
    this._finished = true;

    // Flush any remaining text in the buffer
    if (this._buffer.length > 0) {
      // If there's an incomplete tag at the end, discard it
      const lastOpenBracket = this._buffer.lastIndexOf("<");
      if (lastOpenBracket >= 0 && this._buffer.indexOf(">", lastOpenBracket) === -1) {
        // Incomplete tag — flush text before it
        const textBefore = this._buffer.slice(0, lastOpenBracket);
        if (textBefore) {
          this._appendText(textBefore);
        }
      } else {
        // No incomplete tag — flush everything
        this._appendText(this._buffer);
      }
      this._buffer = "";
    }

    // Auto-close all open elements (except root)
    while (this._stack.length > 1) {
      this._stack.pop();
    }
  }

  /**
   * Process the buffer: extract complete tokens and leave
   * incomplete data in the buffer for next chunk.
   */
  private _processBuffer(): void {
    while (this._buffer.length > 0) {
      // Find the next '<'
      const tagStart = this._buffer.indexOf("<");

      if (tagStart === -1) {
        // No tags — everything is text
        this._appendText(this._buffer);
        this._buffer = "";
        return;
      }

      // Append text before the tag
      if (tagStart > 0) {
        this._appendText(this._buffer.slice(0, tagStart));
        this._buffer = this._buffer.slice(tagStart);
      }

      // Check if we have a complete tag (find matching '>')
      const tagEnd = this._buffer.indexOf(">");

      if (tagEnd === -1) {
        // Incomplete tag — wait for more data
        return;
      }

      // Extract the complete tag
      const tagStr = this._buffer.slice(0, tagEnd + 1);
      this._buffer = this._buffer.slice(tagEnd + 1);

      // Parse and apply the tag
      const parsed = parseTag(tagStr);
      if (parsed) {
        this._applyToken(parsed);
      }
    }
  }

  /** Apply a parsed token to the DOM tree */
  private _applyToken(token: ParsedToken): void {
    switch (token.type) {
      case "text":
        this._appendText(token.text);
        break;

      case "open": {
        const el = document.createElement(token.tag);

        // Set attributes
        for (const [key, value] of Object.entries(token.attrs)) {
          try {
            el.setAttribute(key, value);
          } catch {
            // Invalid attribute name — skip
          }
        }

        this._parent.appendChild(el);

        // Don't push void elements onto the stack — they don't have children
        if (!VOID_ELEMENTS.has(token.tag.toLowerCase())) {
          this._stack.push(el);
        }
        break;
      }

      case "close": {
        const closingTag = token.tag.toLowerCase();

        // Find the matching open element in the stack (search from top)
        let found = -1;
        for (let i = this._stack.length - 1; i >= 1; i--) {
          if (this._stack[i].tagName.toLowerCase() === closingTag) {
            found = i;
            break;
          }
        }

        if (found > 0) {
          // Pop everything above and including the found element
          // This auto-closes any improperly nested tags
          this._stack.length = found;
        }
        // If not found, just ignore the closing tag (tolerant parsing)
        break;
      }
    }
  }

  /** Append a text node to the current parent */
  private _appendText(text: string): void {
    if (!text) return;
    // Merge with the last text node if it exists to avoid excessive node creation
    const lastChild = this._parent.lastChild;
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
      lastChild.textContent = (lastChild.textContent || "") + text;
    } else {
      this._parent.appendChild(document.createTextNode(text));
    }
  }
}

// ============================================================
// Tag Parser
// ============================================================

/** Parse a tag string like `<div class="foo">` or `</div>` or `<br/>` */
export function parseTag(tagStr: string): ParsedToken | null {
  const trimmed = tagStr.trim();

  // Must start with < and end with >
  if (!trimmed.startsWith("<") || !trimmed.endsWith(">")) {
    return null;
  }

  const inner = trimmed.slice(1, -1).trim();

  if (!inner) return null;

  // HTML comment <!-- ... -->
  if (inner.startsWith("!")) {
    return null; // Skip comments and doctypes
  }

  // Closing tag: </div>
  if (inner.startsWith("/")) {
    const tag = inner.slice(1).trim().split(/[\s/>]/)[0];
    if (!tag) return null;
    return { type: "close", tag: tag.toLowerCase() };
  }

  // Opening or self-closing tag: <div class="foo"> or <br/>
  // Extract tag name
  const tagMatch = inner.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);
  if (!tagMatch) return null;

  const tag = tagMatch[1].toLowerCase();
  const rest = inner.slice(tagMatch[0].length);

  // Parse attributes
  const attrs = parseAttributes(rest);

  return { type: "open", tag, attrs };
}

/** Parse attribute string like ` class="foo" id='bar' disabled` */
export function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let s = attrStr.trim();

  // Remove trailing / for self-closing tags like <br/>
  if (s.endsWith("/")) {
    s = s.slice(0, -1).trim();
  }

  if (!s) return attrs;

  // Regex to match attributes in various forms:
  // name="value", name='value', name=value, name (boolean)
  const attrRegex = /([a-zA-Z_:@][\w.:@-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(s)) !== null) {
    const name = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = value;
  }

  return attrs;
}
