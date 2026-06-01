import { sql } from "@/lib/db/client";
import type { StickerWithStatus, AlbumSection } from "@/types";

export async function getUserAlbum(userId: string): Promise<AlbumSection[]> {
  const rows = await sql<StickerWithStatus[]>`
    SELECT
      s.id, s.natural_key AS "naturalKey", s.section_type AS "sectionType",
      s.team_slug AS "teamSlug", s.group_code AS "groupCode",
      s.position_in_section AS "positionInSection", s.position_role AS "positionRole",
      s.sticker_name AS "stickerName", s.is_official_album AS "isOfficialAlbum",
      s.release_batch AS "releaseBatch", s.rarity,
      COALESCE(us.status, 'needs') AS "status",
      COALESCE(us.duplicate_count, 0) AS "duplicateCount"
    FROM stickers s
    LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = ${userId}
    ORDER BY s.section_order, s.position_in_section
  `;

  const sectionMap = new Map<string, AlbumSection>();

  for (const row of rows) {
    // tournament_special tem dois blocos distintos no album fisico: intro (pagina 1)
    // e historia (pagina 98). Diferenciar pelo positionRole para nao agrupá-los.
    const subtype = row.sectionType === 'tournament_special'
      ? (row.positionRole === 'history' ? 'history' : 'intro')
      : '';
    const key = `${row.sectionType}__${row.groupCode ?? ""}__${row.teamSlug ?? ""}__${subtype}`;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, {
        sectionType: row.sectionType,
        groupCode: row.groupCode,
        teamSlug: row.teamSlug,
        stickers: [],
      });
    }
    sectionMap.get(key)!.stickers.push(row);
  }

  return Array.from(sectionMap.values());
}

export async function updateStickerStatus(
  userId: string,
  stickerId: number,
  status: "needs" | "owned" | "duplicate",
  duplicateCount?: number
): Promise<void> {
  const count = status === "duplicate" ? (duplicateCount ?? 1) : 0;

  if (status === "needs") {
    await sql`
      DELETE FROM user_stickers WHERE user_id = ${userId} AND sticker_id = ${stickerId}
    `;
  } else {
    await sql`
      INSERT INTO user_stickers (user_id, sticker_id, status, duplicate_count, updated_at)
      VALUES (${userId}, ${stickerId}, ${status}, ${count}, now())
      ON CONFLICT (user_id, sticker_id) DO UPDATE SET
        status = ${status},
        duplicate_count = ${count},
        updated_at = now()
    `;
  }
}

export async function bulkUpdateTeamStickers(
  userId: string,
  teamSlug: string,
  status: "needs" | "owned" | "duplicate"
): Promise<void> {
  if (status === "needs") {
    await sql`
      DELETE FROM user_stickers
      WHERE user_id = ${userId}
        AND sticker_id IN (SELECT id FROM stickers WHERE team_slug = ${teamSlug})
    `;
  } else {
    await sql`
      INSERT INTO user_stickers (user_id, sticker_id, status, duplicate_count, updated_at)
      SELECT ${userId}, id, ${status}, ${status === "duplicate" ? 1 : 0}, now()
      FROM stickers WHERE team_slug = ${teamSlug}
      ON CONFLICT (user_id, sticker_id) DO UPDATE SET
        status = ${status},
        duplicate_count = CASE WHEN ${status} = 'duplicate' THEN 1 ELSE 0 END,
        updated_at = now()
    `;
  }
}
