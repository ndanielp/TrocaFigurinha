"use client";
import type { AlbumSection } from "@/types";
import { StickerCard } from "./StickerCard";
import { Button } from "@/components/ui/Button";

interface TeamSectionProps {
  section: AlbumSection;
  onStickerChange: (stickerId: number, status: "needs" | "owned" | "duplicate") => void;
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
            {section.teamSlug ?? section.sectionType}
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
