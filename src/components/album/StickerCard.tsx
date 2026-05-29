"use client";
import type { StickerWithStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface StickerCardProps {
  sticker: StickerWithStatus;
  onStatusChange: (stickerId: number, status: "needs" | "owned" | "duplicate") => void;
  loading?: boolean;
}

const statusColors = {
  needs: "bg-gray-100 text-gray-400 border-gray-200",
  owned: "bg-green-50 text-green-700 border-green-200",
  duplicate: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const statusCycle: Record<string, "needs" | "owned" | "duplicate"> = {
  needs: "owned",
  owned: "duplicate",
  duplicate: "needs",
};

export function StickerCard({ sticker, onStatusChange, loading }: StickerCardProps) {
  const status = sticker.status ?? "needs";

  return (
    <button
      onClick={() => onStatusChange(sticker.id, statusCycle[status])}
      disabled={loading}
      className={`
        relative flex flex-col items-center rounded-lg border p-2 text-center transition-all
        hover:shadow-md disabled:opacity-50
        ${statusColors[status]}
      `}
    >
      <span className="text-xs font-bold">{sticker.naturalKey}</span>
      {sticker.positionRole === "badge" && (
        <span className="text-lg">🛡️</span>
      )}
      {sticker.positionRole === "team_photo" && (
        <span className="text-lg">📸</span>
      )}
      {["player", "intro", "history", "promo"].includes(sticker.positionRole) && (
        <span className="text-lg">⚽</span>
      )}
      {sticker.rarity === "gold" && (
        <span className="absolute right-1 top-1 text-xs">✨</span>
      )}
      {status === "duplicate" && sticker.duplicateCount > 0 && (
        <Badge variant="warning" className="mt-1 text-[10px]">
          +{sticker.duplicateCount}
        </Badge>
      )}
    </button>
  );
}
