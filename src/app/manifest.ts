import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finanças — orçamento, DRE e metas",
    short_name: "Finanças",
    description: "Orçamento, DRE, metas e relatórios das suas finanças pessoais.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f6fa",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Versão com margem de segurança: o Android recorta o ícone em círculo/quadrado arredondado
      { src: "/pwa-icon/192?maskable=1", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lançamentos", short_name: "Lançamentos", url: "/lancamentos", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "Orçado x Realizado", short_name: "Orçado x Real", url: "/acompanhamento", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
  };
}
