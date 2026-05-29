import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrocaFigurinha — Álbum FIFA 2026",
  description:
    "Conectamos colecionadores do álbum Panini FIFA 2026 para troca de figurinhas repetidas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
