/**
 * Digital Asset Links (servido em /.well-known/assetlinks.json via rewrite no next.config).
 * Liga o app Android (TWA) a este site, para ele abrir em tela cheia, sem a barra do navegador.
 * Preencha na Vercel quando for publicar na Play Store:
 *   ANDROID_PACKAGE   ex.: br.com.financas.app
 *   ANDROID_SHA256    impressão digital SHA-256 do certificado de assinatura (Play Console >
 *                     Integridade do app > Assinatura de apps). Várias separadas por vírgula.
 * Sem essas variáveis, devolve uma lista vazia (nenhum app associado).
 */
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE?.trim();
  const fingerprints = (process.env.ANDROID_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const body =
    pkg && fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [];

  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
