"use client";

import { useSession } from "@repo/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      router.push("/sign-in");
    }
  }, [session, router]);

  if (!session?.user) {
    return null;
  }

  return <>{children}</>;
}
