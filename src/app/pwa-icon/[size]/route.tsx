import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

/**
 * Ícone do app. Com ?maskable=1, as barras ficam menores e centralizadas dentro da
 * "zona segura" (círculo de 80%), para não serem cortadas quando o Android recorta o ícone.
 */
export async function GET(req: Request, { params }: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.get("maskable") === "1";
  const k = maskable ? 0.62 : 1; // escala das barras
  const bar = (h: number, color: string) => (
    <div style={{ width: size * 0.13 * k, height: size * h * k, background: color, borderRadius: size * 0.03 * k }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: maskable ? "center" : "flex-end",
          justifyContent: "center",
          gap: size * 0.06 * k,
          paddingBottom: maskable ? 0 : size * 0.24,
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
        }}
      >
        {bar(0.22, "#c7d2fe")}
        {bar(0.36, "#e0e7ff")}
        {bar(0.5, "#ffffff")}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
