"use client";

import { useCallback } from "react";

export function useSendMessage() {
  return useCallback(async (prompt: string): Promise<void> => {
    if (typeof window === "undefined" || !window.openai?.sendFollowUpMessage) {
      return Promise.resolve();
    }

    return await window.openai.sendFollowUpMessage({ prompt });
  }, []);
}
