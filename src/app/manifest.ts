import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanças — orçamento, DRE e metas",
    short_name: "Finanças",
    description: "Orçamento, DRE, metas e relatórios das suas finanças pessoais.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
