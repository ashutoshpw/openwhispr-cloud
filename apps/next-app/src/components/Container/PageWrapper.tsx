import { getSession } from "@repo/auth/server";
import { headers } from "next/headers";
import type React from "react";
import Footer from "../LandingPage/Footer";
import { NavBar } from "../NavBar";

export default async function PageWrapper({
  children,
}: { children: React.ReactNode }) {
  const session = await getSession(await headers());
  return (
    <>
      <NavBar initialUser={session?.user ?? null} />
      <main className="page-wrapper-pattern flex min-w-screen flex-col items-center justify-between bg-white dark:bg-black">
        <div className="absolute z-[-99] pointer-events-none inset-0 flex items-center justify-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        {children}
      </main>
      <Footer />
    </>
  );
}
