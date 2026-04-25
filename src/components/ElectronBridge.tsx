"use client";

import { useEffect } from "react";
import { isElectron } from "@/lib/env";

/**
 * In Electron mode, the Next.js app runs inside iframes of the shell.
 * window.open() needs to be intercepted to create new tabs in the shell
 * instead of opening popups or navigating in the same iframe.
 */
export default function ElectronBridge() {
  useEffect(() => {
    if (!isElectron()) return;
    if (typeof window === "undefined") return;

    // Override window.open to send a message to the parent shell
    const originalOpen = window.open.bind(window);
    window.open = function (url?: string | URL, target?: string, features?: string): Window | null {
      if (url) {
        const urlStr = url.toString();

        // External URLs — open via original (Electron will handle it)
        if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
          if (!urlStr.startsWith(window.location.origin)) {
            return originalOpen(url, target, features);
          }
        }

        // Internal navigation — tell the parent shell to create a new tab
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "open-new-tab",
            url: urlStr,
          }, "*");
          return null;
        }
      }

      return originalOpen(url, target, features);
    };

    return () => {
      window.open = originalOpen;
    };
  }, []);

  return null;
}
