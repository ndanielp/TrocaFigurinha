"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import type { User } from "@/types";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

export default function SettingsPage() {
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ displayName: "", cep: "", whatsapp: "", whatsappOptIn: false });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((u: User) => {
        setUser(u);
        setForm({
          displayName: u.displayName,
          cep: u.cep,
          whatsapp: u.whatsapp ?? "",
          whatsappOptIn: u.whatsappOptIn,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        cep: form.cep.replace(/\D/g, ""),
        whatsapp: form.whatsapp || null,
        whatsappOptIn: form.whatsappOptIn,
      }),
    });
    setSaving(false);
    if (res.ok) setMessage("Perfil atualizado com sucesso!");
    else setMessage("Erro ao salvar. Tente novamente.");
  }

  async function handleDelete() {
    await fetch("/api/user/delete", { method: "DELETE" });
    await signOut({ callbackUrl: "/" });
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Configurações</h1>
      </div>

      <div className="mx-auto max-w-md space-y-4 p-4">
        <Card>
          <h2 className="mb-4 font-semibold text-gray-900">Perfil</h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input
              label="Nome de exibição"
              value={form.displayName}
              onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
              minLength={2}
              maxLength={50}
            />
            <Input
              label="CEP"
              value={form.cep}
              onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
              inputMode="numeric"
            />
            <Input
              label="WhatsApp (opcional)"
              value={form.whatsapp}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
            />
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.whatsappOptIn}
                onChange={(e) => setForm((p) => ({ ...p, whatsappOptIn: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600">
                Compartilhar WhatsApp com parceiros de troca (bilateral)
              </span>
            </label>
            {message && (
              <p className={`text-sm ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
            <Button type="submit" loading={saving}>Salvar alterações</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">Conta</h2>
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
            Sair
          </Button>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold text-red-600">Zona de risco</h2>
          <p className="mb-3 text-sm text-gray-500">
            Esta ação removerá permanentemente sua conta e todos os seus dados.
          </p>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Excluir minha conta
          </Button>
        </Card>
      </div>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Excluir conta">
        <p className="mb-6 text-sm text-gray-600">
          Tem certeza? Esta ação não pode ser desfeita. Todos os seus dados serão removidos.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)} className="flex-1">
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Excluir conta
          </Button>
        </div>
      </Modal>
    </div>
  );
}
