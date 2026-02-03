"use server";

import type { UnifiedSession } from "../../types";
import { BetterAuthServer } from "./server";

let serverInstance: BetterAuthServer | null = null;

function getServerInstance(): BetterAuthServer {
  if (!serverInstance) {
    serverInstance = new BetterAuthServer();
  }
  return serverInstance;
}

export async function getBetterAuthSession(
  headers: Headers,
): Promise<UnifiedSession | null> {
  const server = getServerInstance();
  return server.getSession(headers);
}

export async function getBetterAuthApiHandler() {
  const server = getServerInstance();
  return server.getApiHandler();
}
