export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getUserById, updateUserProfile, completeOnboarding } from "@/lib/db/queries/users";
import { z } from "zod";

const updateSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  cep: z.string().regex(/^\d{8}$/).optional(),
  whatsapp: z.string().nullable().optional(),
  whatsappOptIn: z.boolean().optional(),
});

const onboardingSchema = z.object({
  cep: z.string().regex(/^\d{8}$/),
  whatsapp: z.string().optional(),
  whatsappOptIn: z.boolean(),
  displayName: z.string().min(1).max(50).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const isOnboarding = (body as Record<string, unknown>)?._action === "complete_onboarding";

  if (isOnboarding) {
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
    }
    await completeOnboarding(session.user.id, parsed.data);
    return NextResponse.json({ success: true });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateUserProfile(session.user.id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  return NextResponse.json(updated);
}
