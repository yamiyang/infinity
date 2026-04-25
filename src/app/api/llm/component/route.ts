import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { getServerConfig } = await import("@/lib/server-config");
    const config = getServerConfig();
    if (!config.openaiApiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { messages, temperature = 0.85, max_tokens = 4000 } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl || "https://api.openai.com/v1",
    });

    const stream = await client.chat.completions.create({
      model: config.openaiModel || "gpt-4o",
      messages,
      temperature,
      max_tokens,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
