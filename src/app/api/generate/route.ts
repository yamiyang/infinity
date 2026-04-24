import { NextRequest } from "next/server";
import { streamGeneratePage } from "@/lib/openai";
import { getAncestryHistory, createPage, updatePageMeta } from "@/lib/store";
import { GenerateRequest } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/generate
 * Streams AI-generated HTML tokens to the client in real-time.
 *
 * Context model: tree-based ancestry via parentId.
 * - Each page knows its parent (the page the user came from).
 * - History is built by walking up the parent chain — NOT a global linear list.
 * - This supports branching: going back to page B and clicking a new link
 *   gives the new page context [A, B], not [A, B, C, D].
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as GenerateRequest;
  const { query, title, description, parentId } = body;

  const userQuery =
    query || (title && description ? `${title}: ${description}` : "");

  if (!userQuery) {
    return new Response("query is required", { status: 400 });
  }

  // Build context by walking up the ancestry tree from parentId
  const contextHistory = getAncestryHistory(parentId);

  // Create this page in the store (so future children can find it)
  // Use a page ID from the URL or generate one
  const pageId = body.pageId || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  createPage(pageId, userQuery, parentId);

  console.log(`[generate] query="${userQuery}" | pageId=${pageId} | parentId=${parentId || "none"} | ancestry=${contextHistory.length} items`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullHtml = "";
      try {
        await streamGeneratePage(
          userQuery,
          undefined,
          undefined,
          contextHistory,
          (token: string) => {
            fullHtml += token;
            controller.enqueue(encoder.encode(token));
          }
        );

        // Extract metadata and save to the page store
        const titleMatch = fullHtml.match(/<title>(.*?)<\/title>/i);
        const linkMatches = [...fullHtml.matchAll(/data-q="([^"]*)"/g)];
        const links = linkMatches.map((m) => m[1]).slice(0, 6);

        updatePageMeta(
          pageId,
          titleMatch?.[1] || userQuery,
          links
        );

        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`<!--STREAM_ERROR:${msg}-->`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
