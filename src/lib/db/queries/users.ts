import { sql } from "@/lib/db/client";
import type { User } from "@/types";

export async function getUserById(id: string): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT
      id, email, "emailVerified",
      name AS "displayName", cep,
      whatsapp, whatsapp_opt_in AS "whatsappOptIn",
      image AS "avatarUrl",
      account_status AS "accountStatus", created_at AS "createdAt"
    FROM users
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT
      id, email, "emailVerified",
      name AS "displayName", cep,
      whatsapp, whatsapp_opt_in AS "whatsappOptIn",
      image AS "avatarUrl",
      account_status AS "accountStatus", created_at AS "createdAt"
    FROM users
    WHERE email = ${email} AND deleted_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function updateUserProfile(
  id: string,
  data: {
    displayName?: string;
    cep?: string;
    whatsapp?: string | null;
    whatsappOptIn?: boolean;
  }
): Promise<User | null> {
  const rows = await sql<User[]>`
    UPDATE users SET
      name              = COALESCE(${data.displayName ?? null}, name),
      cep               = COALESCE(${data.cep ?? null}, cep),
      whatsapp          = CASE WHEN ${data.whatsapp !== undefined} THEN ${data.whatsapp ?? null} ELSE whatsapp END,
      whatsapp_opt_in   = COALESCE(${data.whatsappOptIn ?? null}, whatsapp_opt_in),
      updated_at        = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING
      id, email, "emailVerified",
      name AS "displayName", cep,
      whatsapp, whatsapp_opt_in AS "whatsappOptIn",
      image AS "avatarUrl",
      account_status AS "accountStatus", created_at AS "createdAt"
  `;
  return rows[0] ?? null;
}

export async function completeOnboarding(
  id: string,
  data: { cep: string; whatsapp?: string; whatsappOptIn: boolean; displayName?: string }
): Promise<void> {
  await sql`
    UPDATE users SET
      cep             = ${data.cep},
      whatsapp        = ${data.whatsapp ?? null},
      whatsapp_opt_in = ${data.whatsappOptIn},
      name            = COALESCE(${data.displayName ?? null}, name),
      account_status  = 'active',
      terms_accepted_at = now(),
      updated_at      = now()
    WHERE id = ${id} AND account_status = 'incomplete_onboarding' AND deleted_at IS NULL
  `;
}

export async function softDeleteUser(id: string): Promise<void> {
  // Marca o usuario como removido (mantido para auditoria, com email/dados anonimizados).
  await sql`
    UPDATE users SET
      deleted_at   = now(),
      email        = concat('deleted_', id, '@deleted.local'),
      name         = 'Conta removida',
      cep          = '00000000',
      whatsapp     = NULL,
      google_id    = NULL,
      updated_at   = now()
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  // Invalidar sessoes ativas imediatamente.
  await sql`DELETE FROM sessions WHERE "userId" = ${id}`;
  // Desfazer o vinculo com a conta Google e limpar a colecao, permitindo que o
  // mesmo usuario crie uma conta nova do zero em um proximo login.
  await sql`DELETE FROM accounts WHERE "userId" = ${id}`;
  await sql`DELETE FROM user_stickers WHERE user_id = ${id}`;
}
