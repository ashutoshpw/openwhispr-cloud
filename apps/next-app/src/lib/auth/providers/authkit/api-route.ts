import "server-only";

import { AuthKitServer } from "./server";

const server = new AuthKitServer();
const handler = server.getApiHandler();

export const GET = handler.GET;
export const POST = handler.POST;
