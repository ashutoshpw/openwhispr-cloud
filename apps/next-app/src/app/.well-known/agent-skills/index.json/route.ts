import { getAgentSkillsIndex } from "@/lib/agent-discovery";

export async function GET(): Promise<Response> {
  return Response.json(getAgentSkillsIndex(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
