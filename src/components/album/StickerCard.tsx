"use client";
import type { StickerWithStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";

interface StickerCardProps {
  sticker: StickerWithStatus;
  onStatusChange: (stickerId: number, status: "needs" | "owned" | "duplicate", duplicateCount: number) => void;
  loading?: boolean;
}

const statusColors = {
  needs: "bg-gray-100 text-gray-400 border-gray-200",
  owned: "bg-green-50 text-green-700 border-green-200",
  duplicate: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const positionRoleIcon: Record<string, string> = {
  badge: "🛡️",
  team_photo: "📸",
  player: "⚽",
  intro: "⚽",
  history: "⚽",
  promo: "⚽",
};

export function StickerCard({ sticker, onStatusChange, loading }: StickerCardProps) {
  const status = sticker.status ?? "needs";
  const count = sticker.duplicateCount ?? 0;
  const possessed = status !== "needs";

  function handleBodyClick() {
    if (status === "needs") {
      onStatusChange(sticker.id, "owned", 0);
    }
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onStatusChange(sticker.id, "needs", 0);
  }

  function handlePlus(e: React.MouseEvent) {
    e.stopPropagation();
    onStatusChange(sticker.id, "duplicate", count + 1);
  }

  function handleMinus(e: React.MouseEvent) {
    e.stopPropagation();
    const newCount = count - 1;
    if (newCount <= 0) {
      onStatusChange(sticker.id, "owned", 0);
    } else {
      onStatusChange(sticker.id, "duplicate", newCount);
    }
  }

  return (
    <div
      onClick={handleBodyClick}
      className={`
        relative flex flex-col items-center rounded-lg border text-center transition-all
        ${possessed ? "cursor-default" : "cursor-pointer hover:shadow-md"}
        ${loading ? "opacity-50 pointer-events-none" : ""}
        ${statusColors[status]}
      `}
    >
      {/* Botão X — remover posse */}
      {possessed && (
        <button
          onClick={handleRemove}
          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] leading-none text-gray-400 hover:bg-red-100 hover:text-red-500"
          aria-label="Remover"
        >
          ×
        </button>
      )}

      {/* Corpo */}
      <div className="flex flex-col items-center px-1 pt-2 pb-1">
        <span className="text-xs font-bold leading-tight">{sticker.naturalKey}</span>
        <span className="text-base leading-tight">
          {positionRoleIcon[sticker.positionRole] ?? "⚽"}
        </span>
        {sticker.rarity === "gold" && (
          <span className="text-[9px] leading-none">✨</span>
        )}
      </div>

      {/* Controles +/- e badge */}
      {possessed && (
        <div className="flex w-full items-center justify-between px-1 pb-1">
          <button
            onClick={handleMinus}
            disabled={count === 0}
            className="flex h-4 w-4 items-center justify-center rounded text-[11px] font-bold leading-none hover:bg-black/10 disabled:opacity-30"
            aria-label="Remover repetida"
          >
            −
          </button>
          {count > 0 ? (
            <Badge variant="warning" className="text-[9px] px-1 py-0">
              +{count}
            </Badge>
          ) : (
            <span className="text-[9px] text-current opacity-50">✓</span>
          )}
          <button
            onClick={handlePlus}
            className="flex h-4 w-4 items-center justify-center rounded text-[11px] font-bold leading-none hover:bg-black/10"
            aria-label="Adicionar repetida"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
