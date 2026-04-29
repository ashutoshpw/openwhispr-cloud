import { allFunctions, inngest } from "@repo/durable-exec";
import { serve } from "inngest/next";

type Handler = (req: Request) => Promise<Response>;

const handler = serve({
  client: inngest,
  functions: allFunctions,
}) as unknown as {
  GET: Handler;
  POST: Handler;
  PUT: Handler;
};

export const GET = (req: Request) => handler.GET(req);
export const POST = (req: Request) => handler.POST(req);
export const PUT = (req: Request) => handler.PUT(req);
