export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getUserAlbum, updateStickerStatus } from "@/lib/db/queries/stickers";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const album = await getUserAlbum(session.user.id);
  return NextResponse.json(album);
}

const updateSchema = z.object({
  stickerId: z.number().int().positive(),
  status: z.enum(["needs", "owned", "duplicate"]),
  duplicateCount: z.number().int().min(1).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  await updateStickerStatus(session.user.id, parsed.data.stickerId, parsed.data.status, parsed.data.duplicateCount);
  return NextResponse.json({ success: true });
}
