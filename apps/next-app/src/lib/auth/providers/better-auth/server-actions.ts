"use server";

import { BetterAuthServer } from "./server";
import type { UnifiedSession } from "../../types";

let serverInstance: BetterAuthServer | null = null;

function getServerInstance(): BetterAuthServer {
  if (!serverInstance) {
    serverInstance = new BetterAuthServer();
  }
  return serverInstance;
}

export async function getBetterAuthSession(
  headers: Headers
): Promise<UnifiedSession | null> {
  const server = getServerInstance();
  return server.getSession(headers);
}

export async function getBetterAuthApiHandler() {
  const server = getServerInstance();
  return server.getApiHandler();
}

