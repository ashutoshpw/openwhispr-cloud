import { TokensManager } from "@/components/account/tokens/tokens-manager";

export const dynamic = "force-dynamic";

export default function TokensPage() {
  return (
    <div className="flex max-w-[800px] flex-col gap-6 px-4 pt-5 pb-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tokens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These tokens allow other apps to control your whole account. Be
          careful!
        </p>
      </div>
      <TokensManager />
    </div>
  );
}
