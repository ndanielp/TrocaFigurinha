"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    cep: "",
    whatsapp: "",
    whatsappOptIn: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pré-preencher o nome com o que veio da conta Google (via perfil do usuário).
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u?.displayName) {
          setForm((prev) => ({ ...prev, displayName: prev.displayName || u.displayName }));
        }
      })
      .catch(() => {});
  }, []);

  const displayName = form.displayName;

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cepDigits = form.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      setError("CEP inválido. Informe 8 dígitos.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _action: "complete_onboarding",
        displayName: displayName.trim() || undefined,
        cep: cepDigits,
        whatsapp: form.whatsapp || undefined,
        whatsappOptIn: form.whatsappOptIn,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erro ao salvar informações.");
      return;
    }

    router.push("/album");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Quase lá!</h1>
        <p className="mb-6 text-sm text-gray-500">
          Complete seu perfil para encontrar colecionadores perto de você.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="displayName"
            label="Por qual nome gostaria de ser chamado?"
            placeholder="Seu nome"
            value={displayName}
            onChange={(e) => update("displayName", e.target.value)}
          />
          <Input
            id="cep"
            label="CEP"
            placeholder="00000-000"
            value={form.cep}
            onChange={(e) => update("cep", e.target.value.replace(/\D/g, "").slice(0, 8))}
            required
            inputMode="numeric"
          />
          <Input
            id="whatsapp"
            label="WhatsApp (opcional)"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
          />

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.whatsappOptIn}
              onChange={(e) => update("whatsappOptIn", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-600">
              Aceito compartilhar meu WhatsApp com parceiros de troca (somente se ambos optarem)
            </span>
          </label>

          <p className="text-xs text-gray-400">
            Ao continuar, você aceita os{" "}
            <a href="/termos" className="text-blue-600 hover:underline">Termos de Uso</a>{" "}
            e a{" "}
            <a href="/privacidade" className="text-blue-600 hover:underline">Política de Privacidade</a>.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Começar a colecionar
          </Button>
        </form>
      </div>
    </div>
  );
}
