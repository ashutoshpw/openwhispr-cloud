import { NextResponse } from "next/server";

// This will show what client-side code sees (baked into bundle)
export async function GET() {
  const clientEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
    NEXT_PUBLIC_AUTH_PROVIDER:
      process.env.NEXT_PUBLIC_AUTH_PROVIDER || "NOT SET",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? "SET"
      : "NOT SET",
  };

  return NextResponse.json({
    message: "These are the NEXT_PUBLIC_* vars baked into the client bundle",
    clientEnv,
    buildTime: new Date().toISOString(),
  });
}
