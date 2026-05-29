import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrocaFigurinha — Álbum FIFA 2026",
    short_name: "TrocaFigurinha",
    description:
      "Troque figurinhas repetidas do álbum Panini FIFA 2026 com colecionadores próximos.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["sports", "social"],
    lang: "pt-BR",
  };
}
