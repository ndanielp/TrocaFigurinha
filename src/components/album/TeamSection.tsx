"use client";
import type { AlbumSection } from "@/types";
import { StickerCard } from "./StickerCard";
import { Button } from "@/components/ui/Button";
import { getTeamName } from "@/lib/teams";

interface TeamSectionProps {
  section: AlbumSection;
  onStickerChange: (stickerId: number, status: "needs" | "owned" | "duplicate", duplicateCount: number) => void;
  onBulkChange: (teamSlug: string, status: "needs" | "owned" | "duplicate") => void;
  loadingIds: Set<number>;
}

export function TeamSection({ section, onStickerChange, onBulkChange, loadingIds }: TeamSectionProps) {
  const owned = section.stickers.filter((s) => s.status !== "needs").length;
  const total = section.stickers.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {section.sectionType === 'tournament_special'
              ? (section.stickers[0]?.positionRole === 'history'
                  ? 'Copa do Mundo 2026 — História'
                  : 'Copa do Mundo 2026 — Abertura')
              : section.sectionType === 'promotional'
                ? 'Coca-Cola'
                : `${section.groupCode ? `Grupo ${section.groupCode} — ` : ""}${getTeamName(section.teamSlug)}`}
          </h3>
          <p className="text-xs text-gray-400">{owned}/{total} figurinhas</p>
        </div>
        {section.teamSlug && (
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => onBulkChange(section.teamSlug!, "owned")}>
              Tenho todas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onBulkChange(section.teamSlug!, "needs")}>
              Limpar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {section.stickers.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            onStatusChange={onStickerChange}
            loading={loadingIds.has(sticker.id)}
          />
        ))}
      </div>
    </div>
  );
}
