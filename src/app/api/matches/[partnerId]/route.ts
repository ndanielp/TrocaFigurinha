import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getMatchDetail } from "@/lib/db/queries/matches";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { partnerId } = await params;
  const detail = await getMatchDetail(session.user.id, partnerId);
  if (!detail) return NextResponse.json({ error: "Match não encontrado." }, { status: 404 });

  return NextResponse.json(detail);
}
