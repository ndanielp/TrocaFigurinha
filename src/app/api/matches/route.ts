export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getMatches } from "@/lib/db/queries/matches";
import { z } from "zod";

const filtersSchema = z.object({
  maxDistanceKm: z.coerce.number().positive().optional(),
  minScore: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = filtersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const result = await getMatches(session.user.id, parsed.data);
  return NextResponse.json(result);
}
