// Dados institucionais exibidos nas páginas públicas.
export const APP_NAME = "Finanças";

/** E-mail de contato para privacidade (LGPD). Defina CONTACT_EMAIL na Vercel. */
export function contactEmail() {
  return process.env.CONTACT_EMAIL?.trim() || null;
}

/**
 * WhatsApp de contato (CONTACT_WHATSAPP na Vercel), em qualquer formato:
 * "(11) 99999-9999", "11999999999" ou "+55 11 99999-9999". Números com DDD e sem o
 * código do país são tratados como brasileiros (+55).
 */
export function contactWhatsapp(message?: string) {
  const raw = (process.env.CONTACT_WHATSAPP ?? "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Começa com "+": o código do país já veio informado
  const hasCountry = raw.startsWith("+");
  if (!hasCountry && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  const local = digits.startsWith("55") ? digits.slice(2) : null;
  const label =
    local && (local.length === 10 || local.length === 11)
      ? `+55 (${local.slice(0, 2)}) ${local.slice(2, local.length - 4)}-${local.slice(-4)}`
      : `+${digits}`;
  const url = `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return { label, url };
}

export const POLICY_UPDATED_AT = "21 de outubro de 2026";
