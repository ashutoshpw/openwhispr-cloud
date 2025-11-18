"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function Settings() {
  const { data: session } = useSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user;

  return (
    <div className="flex justify-start items-center flex-wrap px-4 pt-5 gap-4">
      <div className="flex flex-col gap-3 mb-[5rem] w-full max-w-[700px]">
        <h2 className="mt-10 scroll-m-20 border-b pb-2 w-full text-3xl font-semibold tracking-tight transition-colors first:mt-0">
          My Profile
        </h2>
        <div className="flex w-full gap-3 mt-3">
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
