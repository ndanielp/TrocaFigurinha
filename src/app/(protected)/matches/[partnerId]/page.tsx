"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { MatchDetail } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

export default function MatchDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${partnerId}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); return; }
        setDetail(await r.json());
      })
      .finally(() => setLoading(false));
  }, [partnerId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (notFound || !detail) return <div className="p-8 text-center text-gray-400">Match não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="border-b bg-white px-4 py-3">
        <Link href="/matches" className="text-sm text-blue-600">← Voltar</Link>
        <h1 className="mt-1 text-lg font-bold text-gray-900">{detail.partnerName}</h1>
        <p className="text-sm text-gray-500">{detail.distanceKm} km • Score {detail.score}</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        {detail.whatsappAvailable && detail.whatsappLink && (
          <Card className="border-green-200 bg-green-50">
            <p className="mb-3 text-sm font-medium text-green-800">
              Ambos aceitam contato por WhatsApp!
            </p>
            <a href={detail.whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Iniciar conversa no WhatsApp
              </Button>
            </a>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-semibold text-gray-900">
            Eu dou ({detail.euDou.length} figurinhas)
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.euDou.map((s) => (
              <Badge key={s.id} variant="warning">{s.naturalKey}</Badge>
            ))}
            {detail.euDou.length === 0 && <p className="text-sm text-gray-400">Nenhuma</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-gray-900">
            Eu recebo ({detail.euRecebo.length} figurinhas)
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.euRecebo.map((s) => (
              <Badge key={s.id} variant="info">{s.naturalKey}</Badge>
            ))}
            {detail.euRecebo.length === 0 && <p className="text-sm text-gray-400">Nenhuma</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
