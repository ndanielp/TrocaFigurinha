"use client";
import { useEffect, useState } from "react";
import type { UserStats } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Card>
          <h2 className="mb-4 font-semibold text-gray-700">Progresso do Álbum</h2>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-blue-600">
              {stats?.albumCompletionPct ?? 0}%
            </span>
            <span className="text-sm text-gray-500">do álbum oficial (980 figurinhas)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${stats?.albumCompletionPct ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {stats?.totalDuplicates ?? 0} figurinhas repetidas disponíveis para troca
          </p>
        </Card>

        {(stats?.topDemandedStickers?.length ?? 0) > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold text-gray-700">Suas repetidas mais cobiçadas</h2>
            <div className="space-y-2">
              {stats!.topDemandedStickers.map((s) => (
                <div key={s.stickerId} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{s.naturalKey}</span>
                    <span className="ml-2 text-sm text-gray-500">{s.stickerName}</span>
                  </div>
                  <Badge variant="info">{s.demandCount} querem</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/album">
            <Card className="cursor-pointer hover:border-blue-300">
              <p className="font-medium text-gray-900">Ver álbum</p>
              <p className="text-xs text-gray-400">Gerencie suas figurinhas</p>
            </Card>
          </Link>
          <Link href="/matches">
            <Card className="cursor-pointer hover:border-blue-300">
              <p className="font-medium text-gray-900">Ver matches</p>
              <p className="text-xs text-gray-400">Encontre parceiros de troca</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
