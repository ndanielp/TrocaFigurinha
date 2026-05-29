import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getUserStats } from "@/lib/db/queries/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const stats = await getUserStats(session.user.id);
  return NextResponse.json(stats);
}
