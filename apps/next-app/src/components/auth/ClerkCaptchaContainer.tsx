"use client";

import { useEffect, useState } from "react";

export function ClerkCaptchaContainer() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Only render on client-side and if Clerk is the provider
    const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
    if (provider === "clerk-dev") {
      setShouldRender(true);
    }
  }, []);

  if (!shouldRender) {
    return null;
  }

  return <div id="cl-captcha" style={{ display: "none" }} aria-hidden="true" />;
}
