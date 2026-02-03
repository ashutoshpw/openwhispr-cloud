"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";

export default function WorkspaceSettings() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    // Middleware handles auth - this is just a fallback loading state
    return (
      <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
        <div>Loading...</div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="flex flex-wrap justify-start items-center gap-4 px-4 pt-5">
      <div className="flex flex-col gap-3 mb-[5rem] w-full max-w-[700px]">
        <h2 className="mt-10 first:mt-0 pb-2 border-b w-full font-semibold text-3xl tracking-tight transition-colors scroll-m-20">
          Workspace Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your workspace settings, members, and billing.
        </p>

        <h3 className="mt-8 pb-2 border-b w-full font-semibold text-xl tracking-tight scroll-m-20">
          My Profile
        </h3>
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
