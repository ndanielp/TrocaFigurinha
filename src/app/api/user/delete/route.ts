export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { softDeleteUser } from "@/lib/db/queries/users";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await softDeleteUser(session.user.id);
  logger.accountDeleted(session.user.id);
  return NextResponse.json({ success: true });
}
