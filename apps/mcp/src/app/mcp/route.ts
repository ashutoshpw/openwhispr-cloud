import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "not_implemented",
        message: "MCP server not wired up yet",
      },
    },
    { status: 501 },
  );
}

export async function POST() {
  return GET();
}
