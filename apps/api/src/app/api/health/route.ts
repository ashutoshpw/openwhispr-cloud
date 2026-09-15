import { NextResponse } from "next/server";

function corsHeaders(request: Request): HeadersInit {
  return {
    "access-control-allow-origin": request.headers.get("origin") ?? "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  return NextResponse.json(
    { ok: true, service: "api" },
    { headers: corsHeaders(request) },
  );
}
