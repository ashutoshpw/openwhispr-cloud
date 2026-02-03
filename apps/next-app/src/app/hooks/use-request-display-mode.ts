"use client";

import { useCallback } from "react";
import type { DisplayMode } from "./types";

export function useRequestDisplayMode() {
  return useCallback(
    async (mode: DisplayMode): Promise<{ mode: DisplayMode }> => {
      if (typeof window === "undefined" || !window.openai?.requestDisplayMode) {
        return { mode };
      }

      return await window.openai.requestDisplayMode({ mode });
    },
    [],
  );
}
