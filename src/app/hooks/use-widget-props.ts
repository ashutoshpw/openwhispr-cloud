"use client";

import { useOpenAIGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T | null {
  const toolOutput = useOpenAIGlobal("toolOutput");
  
  if (toolOutput) {
    return toolOutput as T;
  }
  
  if (typeof defaultState === "function") {
    return defaultState();
  }
  
  return (defaultState ?? null) as T | null;
}
