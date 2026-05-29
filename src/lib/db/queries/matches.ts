import { sql } from "@/lib/db/client";
import type { Match, MatchDetail, MatchFilters, PaginatedMatches } from "@/types";

export async function getMatches(userId: string, filters: MatchFilters = {}): Promise<PaginatedMatches> {
  const { maxDistanceKm = null, minScore = 1, page = 1, perPage = 20 } = filters;
  const offset = (page - 1) * perPage;

  const rows = await sql<{
    partner_id: string;
    partner_name: string;
    partner_avatar_url: string | null;
    partner_whatsapp_opt_in: boolean;
    eu_dou: number;
    eu_recebo: number;
    score: number;
    distance_km: number;
  }[]>`
    SELECT
      b.id               AS partner_id,
      b.display_name     AS partner_name,
      b.avatar_url       AS partner_avatar_url,
      b.whatsapp_opt_in  AS partner_whatsapp_opt_in,
      eu_dou.cnt         AS eu_dou,
      eu_recebo.cnt      AS eu_recebo,
      LEAST(eu_dou.cnt, eu_recebo.cnt) AS score,
      ROUND(
        earth_distance(
          ll_to_earth(ca.lat, ca.lng),
          ll_to_earth(cb.lat, cb.lng)
        ) / 1000.0
      )::int AS distance_km
    FROM users b
    JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM user_stickers ua
      LEFT JOIN user_stickers ub ON ua.sticker_id = ub.sticker_id AND ub.user_id = b.id
      WHERE ua.user_id = ${userId}
        AND ua.status = 'duplicate'
        AND (ub.status = 'needs' OR ub.status IS NULL)
    ) eu_dou ON TRUE
    JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM user_stickers ub
      LEFT JOIN user_stickers ua ON ub.sticker_id = ua.sticker_id AND ua.user_id = ${userId}
      WHERE ub.user_id = b.id
        AND ub.status = 'duplicate'
        AND (ua.status = 'needs' OR ua.status IS NULL)
    ) eu_recebo ON TRUE
    JOIN users a ON a.id = ${userId}
    JOIN cep_centroids ca ON LEFT(a.cep, 5) = ca.cep_prefix
    JOIN cep_centroids cb ON LEFT(b.cep, 5) = cb.cep_prefix
    WHERE b.id != ${userId}
      AND b.account_status = 'active'
      AND b.deleted_at IS NULL
      AND LEAST(eu_dou.cnt, eu_recebo.cnt) >= ${minScore}
      AND (
        ${maxDistanceKm}::float IS NULL OR
        earth_distance(
          ll_to_earth(ca.lat, ca.lng),
          ll_to_earth(cb.lat, cb.lng)
        ) / 1000.0 <= ${maxDistanceKm}
      )
    ORDER BY score DESC, distance_km ASC
    LIMIT ${perPage} OFFSET ${offset}
  `;

  const countResult = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM users b
    JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM user_stickers ua
      LEFT JOIN user_stickers ub ON ua.sticker_id = ub.sticker_id AND ub.user_id = b.id
      WHERE ua.user_id = ${userId}
        AND ua.status = 'duplicate'
        AND (ub.status = 'needs' OR ub.status IS NULL)
    ) eu_dou ON TRUE
    JOIN LATERAL (
      SELECT COUNT(*)::int AS cnt
      FROM user_stickers ub
      LEFT JOIN user_stickers ua ON ub.sticker_id = ua.sticker_id AND ua.user_id = ${userId}
      WHERE ub.user_id = b.id
        AND ub.status = 'duplicate'
        AND (ua.status = 'needs' OR ua.status IS NULL)
    ) eu_recebo ON TRUE
    JOIN users a ON a.id = ${userId}
    JOIN cep_centroids ca ON LEFT(a.cep, 5) = ca.cep_prefix
    JOIN cep_centroids cb ON LEFT(b.cep, 5) = cb.cep_prefix
    WHERE b.id != ${userId}
      AND b.account_status = 'active'
      AND b.deleted_at IS NULL
      AND LEAST(eu_dou.cnt, eu_recebo.cnt) >= ${minScore}
      AND (
        ${maxDistanceKm}::float IS NULL OR
        earth_distance(
          ll_to_earth(ca.lat, ca.lng),
          ll_to_earth(cb.lat, cb.lng)
        ) / 1000.0 <= ${maxDistanceKm}
      )
  `;

  const userRow = await sql<{ whatsapp_opt_in: boolean }[]>`
    SELECT whatsapp_opt_in FROM users WHERE id = ${userId}
  `;
  const myOptIn = userRow[0]?.whatsapp_opt_in ?? false;

  const matches: Match[] = rows.map((row) => ({
    partnerId: row.partner_id,
    partnerName: row.partner_name,
    partnerAvatarUrl: row.partner_avatar_url,
    score: row.score,
    distanceKm: row.distance_km,
    euDou: row.eu_dou,
    euRecebo: row.eu_recebo,
    whatsappAvailable: myOptIn && row.partner_whatsapp_opt_in,
    previewGive: [],
    previewReceive: [],
  }));

  return {
    matches,
    total: countResult[0]?.total ?? 0,
    page,
    perPage,
  };
}

export async function getMatchDetail(userId: string, partnerId: string): Promise<MatchDetail | null> {
  const partnerRow = await sql<{
    display_name: string;
    avatar_url: string | null;
    whatsapp: string | null;
    whatsapp_opt_in: boolean;
    cep: string;
  }[]>`
    SELECT display_name, avatar_url, whatsapp, whatsapp_opt_in, cep
    FROM users WHERE id = ${partnerId} AND account_status = 'active' AND deleted_at IS NULL
  `;

  if (!partnerRow[0]) return null;

  const partner = partnerRow[0];

  const meRow = await sql<{ whatsapp: string | null; whatsapp_opt_in: boolean; cep: string }[]>`
    SELECT whatsapp, whatsapp_opt_in, cep FROM users WHERE id = ${userId}
  `;
  const me = meRow[0];

  const distanceResult = await sql<{ distance_km: number }[]>`
    SELECT ROUND(
      earth_distance(ll_to_earth(ca.lat, ca.lng), ll_to_earth(cb.lat, cb.lng)) / 1000.0
    )::int AS distance_km
    FROM cep_centroids ca, cep_centroids cb
    WHERE ca.cep_prefix = LEFT(${me.cep}, 5) AND cb.cep_prefix = LEFT(${partner.cep}, 5)
  `;

  const euDou = await sql<{ id: number; natural_key: string; sticker_name: string; team_slug: string | null; position_in_section: number }[]>`
    SELECT s.id, s.natural_key, s.sticker_name, s.team_slug, s.position_in_section
    FROM user_stickers ua
    JOIN stickers s ON s.id = ua.sticker_id
    LEFT JOIN user_stickers ub ON ua.sticker_id = ub.sticker_id AND ub.user_id = ${partnerId}
    WHERE ua.user_id = ${userId}
      AND ua.status = 'duplicate'
      AND (ub.status = 'needs' OR ub.status IS NULL)
    ORDER BY s.team_slug, s.position_in_section
  `;

  const euRecebo = await sql<{ id: number; natural_key: string; sticker_name: string; team_slug: string | null; position_in_section: number }[]>`
    SELECT s.id, s.natural_key, s.sticker_name, s.team_slug, s.position_in_section
    FROM user_stickers ub
    JOIN stickers s ON s.id = ub.sticker_id
    LEFT JOIN user_stickers ua ON ub.sticker_id = ua.sticker_id AND ua.user_id = ${userId}
    WHERE ub.user_id = ${partnerId}
      AND ub.status = 'duplicate'
      AND (ua.status = 'needs' OR ua.status IS NULL)
    ORDER BY s.team_slug, s.position_in_section
  `;

  const whatsappAvailable = me.whatsapp_opt_in && partner.whatsapp_opt_in;
  const score = Math.min(euDou.length, euRecebo.length);

  return {
    partnerId,
    partnerName: partner.display_name,
    partnerAvatarUrl: partner.avatar_url,
    score,
    distanceKm: distanceResult[0]?.distance_km ?? 0,
    euDou: euDou.map((s) => ({ id: s.id, naturalKey: s.natural_key, stickerName: s.sticker_name, teamSlug: s.team_slug, positionInSection: s.position_in_section })),
    euRecebo: euRecebo.map((s) => ({ id: s.id, naturalKey: s.natural_key, stickerName: s.sticker_name, teamSlug: s.team_slug, positionInSection: s.position_in_section })),
    whatsappAvailable,
    whatsappLink: whatsappAvailable && partner.whatsapp
      ? `https://wa.me/${partner.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vi que temos figurinhas para trocar no TrocaFigurinha.")}`
      : null,
  };
}
