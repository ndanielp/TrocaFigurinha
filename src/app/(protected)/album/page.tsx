"use client";
import { useEffect, useState, useCallback } from "react";
import type { AlbumSection } from "@/types";
import { TeamSection } from "@/components/album/TeamSection";
import { Spinner } from "@/components/ui/Spinner";

export default function AlbumPage() {
  const [sections, setSections] = useState<AlbumSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/collection/sticker")
      .then((r) => r.json())
      .then(setSections)
      .finally(() => setLoading(false));
  }, []);

  const handleStickerChange = useCallback(
    async (stickerId: number, status: "needs" | "owned" | "duplicate") => {
      setLoadingIds((prev) => new Set(prev).add(stickerId));

      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          stickers: section.stickers.map((s) =>
            s.id === stickerId
              ? { ...s, status, duplicateCount: status === "duplicate" ? Math.max(s.duplicateCount, 1) : 0 }
              : s
          ),
        }))
      );

      await fetch("/api/collection/sticker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stickerId, status }),
      });

      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(stickerId);
        return next;
      });
    },
    []
  );

  const handleBulkChange = useCallback(
    async (teamSlug: string, status: "needs" | "owned" | "duplicate") => {
      setSections((prev) =>
        prev.map((section) =>
          section.teamSlug === teamSlug
            ? {
                ...section,
                stickers: section.stickers.map((s) => ({
                  ...s,
                  status,
                  duplicateCount: status === "duplicate" ? 1 : 0,
                })),
              }
            : section
        )
      );

      await fetch("/api/collection/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamSlug, status }),
      });
    },
    []
  );

  const totalOfficial = sections.flatMap((s) => s.stickers).filter((s) => s.isOfficialAlbum).length;
  const ownedOfficial = sections
    .flatMap((s) => s.stickers)
    .filter((s) => s.isOfficialAlbum && s.status !== "needs").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Meu Álbum</h1>
        <p className="text-sm text-gray-500">
          {ownedOfficial}/{totalOfficial} figurinhas oficiais •{" "}
          {totalOfficial > 0 ? Math.round((ownedOfficial / totalOfficial) * 100) : 0}% completo
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 p-4">
        {sections.map((section) => (
          <TeamSection
            key={`${section.sectionType}-${section.teamSlug ?? section.groupCode ?? ""}`}
            section={section}
            onStickerChange={handleStickerChange}
            onBulkChange={handleBulkChange}
            loadingIds={loadingIds}
          />
        ))}
      </div>
    </div>
  );
}
