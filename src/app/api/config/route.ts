import { NextRequest, NextResponse } from "next/server";

// This route only exists in Electron builds (web build script removes api/ directory)
export const dynamic = "force-dynamic";

/**
 * GET /api/config
 * - ?action=full → full config including API keys (for Settings modal)
 * - default → safe config (keys masked)
 */
export async function GET(request: NextRequest) {
  const { getSafeConfig, getServerConfig } = await import("@/lib/server-config");
  const url = new URL(request.url);

  if (url.searchParams.get("action") === "full") {
    return NextResponse.json(getServerConfig());
  }

  return NextResponse.json(getSafeConfig());
}

/** POST /api/config — save config */
export async function POST(request: NextRequest) {
  try {
    const { saveServerConfig } = await import("@/lib/server-config");
    const body = await request.json();
    const updated = saveServerConfig(body);
    return NextResponse.json({
      provider: updated.provider,
      openaiBaseUrl: updated.openaiBaseUrl,
      openaiModel: updated.openaiModel,
      hasApiKey: !!updated.openaiApiKey,
      hasPixabayKey: !!updated.pixabayApiKey,
      hasPexelsKey: !!updated.pexelsApiKey,
      hasUnsplashKey: !!updated.unsplashAccessKey,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
