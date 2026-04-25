import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = process.env.REPO_NAME || "";
const isElectron = process.env.BUILD_TARGET === "electron";
const basePath = isProd && repoName && !isElectron ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  // Static export for web (GitHub Pages), server mode for Electron (needs API routes)
  ...(isElectron ? {} : { output: "export" }),
  basePath,
  assetPrefix: isProd && repoName && !isElectron ? `/${repoName}/` : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_BUILD_TARGET: isElectron ? "electron" : "web",
  },
};

export default nextConfig;
