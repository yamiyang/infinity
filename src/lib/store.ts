import { PageData, HistoryItem } from "@/types";

const MAX_PAGES = 1000;
const MAX_ANCESTRY = 10; // Max ancestor pages to include in context

const pageStore = new Map<string, PageData>();

export function createPage(id: string, query: string, parentId?: string): PageData {
  const page: PageData = {
    id,
    query,
    html: "",
    createdAt: Date.now(),
    parentId,
  };

  // Evict old pages if needed
  if (pageStore.size >= MAX_PAGES) {
    const oldest = [...pageStore.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    );
    const toRemove = oldest.slice(0, Math.floor(MAX_PAGES * 0.2));
    toRemove.forEach(([key]) => pageStore.delete(key));
  }

  pageStore.set(id, page);
  return page;
}

export function appendPageHtml(id: string, delta: string): void {
  const page = pageStore.get(id);
  if (page) {
    page.html += delta;
  }
}

export function getPage(id: string): PageData | undefined {
  return pageStore.get(id);
}

/**
 * Update page metadata after generation completes (title, links).
 */
export function updatePageMeta(id: string, title: string, links: string[]): void {
  const page = pageStore.get(id);
  if (page) {
    page.title = title;
    page.links = links;
  }
}

/**
 * Walk up the ancestry chain from parentId to build a history array.
 * Returns history in chronological order (oldest ancestor first).
 *
 * This is the core of the tree-based context system:
 * - A → B → C: C gets [A, B]
 * - Go back to B, click new link → E: E gets [A, B] (not [A, B, C])
 * - From homepage (no parentId): gets []
 */
export function getAncestryHistory(parentId?: string): HistoryItem[] {
  if (!parentId) return [];

  const ancestors: PageData[] = [];
  let currentId: string | undefined = parentId;

  // Walk up the chain, collecting ancestors
  while (currentId && ancestors.length < MAX_ANCESTRY) {
    const page = pageStore.get(currentId);
    if (!page) break; // Page evicted or not found
    ancestors.push(page);
    currentId = page.parentId;
  }

  // Reverse to chronological order (oldest first)
  ancestors.reverse();

  // Convert to HistoryItem format
  return ancestors.map((page) => ({
    query: page.query,
    title: page.title || page.query,
    description: page.query,
    links: page.links || [],
  }));
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
