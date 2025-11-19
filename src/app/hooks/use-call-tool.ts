"use client";

import { useCallback } from "react";
import type { CallToolResponse } from "./types";

export function useCallTool() {
  return useCallback(
    async (
      name: string,
      args: Record<string, unknown>,
    ): Promise<CallToolResponse | null> => {
      if (typeof window === "undefined" || !window.openai?.callTool) {
        return null;
      }

      return await window.openai.callTool(name, args);
    },
    [],
  );
}
