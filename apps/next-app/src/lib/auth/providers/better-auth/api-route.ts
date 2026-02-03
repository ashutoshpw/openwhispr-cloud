import "server-only";

import { BetterAuthServer } from "./server";

const server = new BetterAuthServer();
const handler = server.getApiHandler();

export const GET = handler.GET;
export const POST = handler.POST;
