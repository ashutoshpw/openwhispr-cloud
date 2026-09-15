import { notFoundError, toV1Transcription } from "@/lib/v1";
import { withV1Key } from "@/lib/v1-auth";
import { v1Ok } from "@repo/api-schemas/v1/contract";
import { db } from "@repo/database";
import { and, eq, isNull } from "@repo/database";
import { transcription } from "@repo/database/schema";

/** GET /api/v1/transcriptions/{id} — personal keys only, own rows. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return withV1Key(
    request,
    { personalOnly: true, personal: "transcriptions:read" },
    async (auth) => {
      const [row] = await db()
        .select()
        .from(transcription)
        .where(
          and(
            eq(transcription.id, id),
            eq(transcription.userId, auth.userId),
            isNull(transcription.deletedAt),
          ),
        )
        .limit(1);
      if (!row) return notFoundError("Transcription not found");

      return v1Ok(toV1Transcription(row));
    },
  );
}
