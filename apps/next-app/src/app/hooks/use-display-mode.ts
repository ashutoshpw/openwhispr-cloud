"use client";

import type { DisplayMode } from "./types";
import { useOpenAIGlobal } from "./use-openai-global";

export function useDisplayMode(): DisplayMode | null {
  return useOpenAIGlobal("displayMode");
}
