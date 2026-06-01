"use client";
import { useEffect, useState } from "react";
import type { PaginatedMatches, Match } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

export default function MatchesPage() {
  const [data, setData] = useState<PaginatedMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxDist, setMaxDist] = useState("");

  function load(dist?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (dist) params.set("maxDistanceKm", dist);
    fetch(`/api/matches?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Matches</h1>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            placeholder="Distância máx. (km)"
            value={maxDist}
            onChange={(e) => setMaxDist(e.target.value)}
            className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <Button size="sm" onClick={() => load(maxDist || undefined)}>
            Filtrar
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : data?.matches.length === 0 && !data?.anonymousCount ? (
          <p className="py-10 text-center text-gray-400">
            Nenhum match encontrado. Adicione mais figurinhas repetidas ao seu álbum!
          </p>
        ) : (
          <>
            {data?.matches.map((match) => <MatchCard key={match.partnerId} match={match} />)}
            {(data?.anonymousCount ?? 0) > 0 && (
              <AnonymousMatchCard count={data!.anonymousCount} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AnonymousMatchCard({ count }: { count: number }) {
  return (
    <Card className="border-dashed border-amber-300 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500 text-lg">
          🔒
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-800">
            {count === 1
              ? "Alguém próximo tem figurinhas que você precisa"
              : `${count} pessoas próximas têm figurinhas que você precisa`}
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Inclua suas figurinhas repetidas para ver quem são e propor a troca.
          </p>
        </div>
      </div>
    </Card>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
          {match.partnerAvatarUrl ? (
            <img src={match.partnerAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            match.partnerName[0]?.toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{match.partnerName}</p>
            {match.whatsappAvailable && (
              <Badge variant="success">WhatsApp</Badge>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {match.distanceKm != null ? `${match.distanceKm} km de distância` : "Distância indisponível"}
          </p>
          <div className="mt-2 flex gap-3 text-sm">
            <span className="text-green-600">↑ {match.euDou} para dar</span>
            <span className="text-blue-600">↓ {match.euRecebo} para receber</span>
            <Badge variant="info">Score {match.score}</Badge>
          </div>
        </div>
        <Link href={`/matches/${match.partnerId}`}>
          <Button size="sm" variant="secondary">Ver</Button>
        </Link>
      </div>
    </Card>
  );
}
