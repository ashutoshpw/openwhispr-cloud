import "server-only";

import { ClerkServer } from "./server";

const server = new ClerkServer();
const handler = server.getApiHandler();

export const GET = handler.GET;
export const POST = handler.POST;
