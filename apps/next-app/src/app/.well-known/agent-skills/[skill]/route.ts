import { getAgentSkillsIndex, getSkillDocument } from "@/lib/agent-discovery";

export async function GET(
  _request: Request,
  context: { params: Promise<{ skill: string }> },
): Promise<Response> {
  const { skill } = await context.params;
  const entry = getAgentSkillsIndex().skills.find((item) =>
    item.url.endsWith(`/.well-known/agent-skills/${skill}`),
  );

  if (!entry) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(
    getSkillDocument(entry.name, entry.description, entry.url),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600",
      },
    },
  );
}
