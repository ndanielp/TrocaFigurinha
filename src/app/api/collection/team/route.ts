import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { bulkUpdateTeamStickers } from "@/lib/db/queries/stickers";
import { z } from "zod";

const schema = z.object({
  teamSlug: z.string().length(3),
  status: z.enum(["needs", "owned", "duplicate"]),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  await bulkUpdateTeamStickers(session.user.id, parsed.data.teamSlug, parsed.data.status);
  return NextResponse.json({ success: true });
}
