import "server-only";

import { NextAuthServer } from "./server";

const server = new NextAuthServer();
const handler = server.getApiHandler();

export const GET = handler.GET;
export const POST = handler.POST;
