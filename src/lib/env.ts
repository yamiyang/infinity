"use client";

/** Whether the app was built for Electron (determined at build time via next.config.ts) */
export function isElectron(): boolean {
  return process.env.NEXT_PUBLIC_BUILD_TARGET === "electron";
}

/** Whether we're running inside an Electron renderer (runtime check) */
export function isElectronRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { __ELECTRON__?: boolean }).__ELECTRON__;
}

/** Get the backend API base URL.
 *  - Web mode: not used (browser calls LLM directly)
 *  - Electron mode: Next.js server at localhost
 */
export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  // In Electron, Next.js runs on a local port
  return window.location.origin;
}
