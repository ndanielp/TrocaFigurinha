export const dynamic = 'force-dynamic';
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

  // Recusar acesso a detalhes quando nao ha reciprocidade (eu_dou=0).
  if (detail.euDou.length === 0) {
    return NextResponse.json({ error: "Match não encontrado." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
