import { baseServer } from "@repo/auth/server";

export async function GET(request: Request) {
  const handler = await baseServer.getApiHandler();
  return handler.GET(request);
}

export async function POST(request: Request) {
  const handler = await baseServer.getApiHandler();
  return handler.POST(request);
}
