import { sql } from "@/lib/db/client";
import type { UserStats } from "@/types";

export async function getUserStats(userId: string): Promise<UserStats> {
  const completionResult = await sql<{ album_completion_pct: number | null; total_duplicates: number }[]>`
    SELECT
      ROUND(
        100.0 * COUNT(*) FILTER (
          WHERE us.status IN ('owned', 'duplicate') AND s.is_official_album = true
        ) / NULLIF(SUM(CASE WHEN s.is_official_album THEN 1 ELSE 0 END), 0),
        1
      ) AS album_completion_pct,
      COUNT(*) FILTER (WHERE us.status = 'duplicate')::int AS total_duplicates
    FROM stickers s
    LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = ${userId}
  `;

  const topDemanded = await sql<{
    sticker_id: number;
    natural_key: string;
    sticker_name: string;
    team_slug: string | null;
    demand_count: number;
  }[]>`
    SELECT
      s.id AS sticker_id,
      s.natural_key,
      s.sticker_name,
      s.team_slug,
      COUNT(*)::int AS demand_count
    FROM user_stickers my_dupes
    JOIN stickers s ON s.id = my_dupes.sticker_id
    JOIN user_stickers others ON others.sticker_id = my_dupes.sticker_id
      AND others.status IN ('needs')
      AND others.user_id != ${userId}
    WHERE my_dupes.user_id = ${userId} AND my_dupes.status = 'duplicate'
    GROUP BY s.id, s.natural_key, s.sticker_name, s.team_slug
    ORDER BY demand_count DESC
    LIMIT 5
  `;

  return {
    albumCompletionPct: completionResult[0]?.album_completion_pct ?? 0,
    totalDuplicates: completionResult[0]?.total_duplicates ?? 0,
    topDemandedStickers: topDemanded.map((row) => ({
      stickerId: row.sticker_id,
      naturalKey: row.natural_key,
      stickerName: row.sticker_name,
      teamSlug: row.team_slug,
      demandCount: row.demand_count,
    })),
  };
}
