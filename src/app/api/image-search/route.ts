import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const count = parseInt(searchParams.get("count") || "5", 10);
  const provider = searchParams.get("provider") || "pixabay";

  if (!query) {
    return NextResponse.json({ urls: [] });
  }

  const { getServerConfig } = await import("@/lib/server-config");
  const config = getServerConfig();

  try {
    let urls: string[] = [];

    if (provider === "pixabay" && config.pixabayApiKey) {
      const res = await fetch(
        `https://pixabay.com/api/?key=${config.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=${count}&safesearch=true`,
        { signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      urls = (data.hits || []).map((h: { webformatURL: string }) => h.webformatURL);
    } else if (provider === "pexels" && config.pexelsApiKey) {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
        { headers: { Authorization: config.pexelsApiKey }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      urls = (data.photos || []).map((p: { src: { large: string } }) => p.src.large);
    } else if (provider === "unsplash" && config.unsplashAccessKey) {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${config.unsplashAccessKey}` }, signal: AbortSignal.timeout(6000) }
      );
      const data = await res.json();
      urls = (data.results || []).map((r: { urls: { regular: string } }) => r.urls.regular);
    }

    return NextResponse.json({ urls });
  } catch {
    return NextResponse.json({ urls: [] });
  }
}

/** POST: check which image providers have keys configured */
export async function POST() {
  const { getServerConfig } = await import("@/lib/server-config");
  const config = getServerConfig();
  return NextResponse.json({
    hasPixabay: !!config.pixabayApiKey,
    hasPexels: !!config.pexelsApiKey,
    hasUnsplash: !!config.unsplashAccessKey,
  });
}
