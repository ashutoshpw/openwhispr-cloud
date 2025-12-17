"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Settings() {
  const { data: session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.push("/sign-in");
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
      <div className="flex flex-col gap-3 mb-[5rem] w-full max-w-[700px]">
        <h2 className="mt-10 first:mt-0 pb-2 border-b w-full font-semibold text-3xl tracking-tight transition-colors scroll-m-20">
          My Profile
        </h2>
        <div className="flex gap-3 mt-3 w-full">
          <div className="flex flex-col gap-3 w-full">
            <Label>Name</Label>
            <Input disabled defaultValue={user?.name || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>E-mail</Label>
            <Input disabled defaultValue={user?.email || ""} />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <Label>Email Verified</Label>
            <Input disabled defaultValue={user?.emailVerified ? "Yes" : "No"} />
          </div>
        </div>
      </div>
    </div>
  );
}
