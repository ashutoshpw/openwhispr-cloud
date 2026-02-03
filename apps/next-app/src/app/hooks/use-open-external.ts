"use client";

import { useCallback } from "react";

export function useOpenExternal() {
  return useCallback((href: string): void => {
    try {
      if (typeof window !== "undefined" && window.openai?.openExternal) {
        window.openai.openExternal({ href });
        return;
      }
    } catch (e) {
      console.warn("openExternal failed, falling back to window.open", e);
    }

    // Fallback to window.open
    if (typeof window !== "undefined") {
      window.open(href, "_blank");
    }
  }, []);
}
