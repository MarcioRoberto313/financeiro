// Dados institucionais exibidos nas páginas públicas.
export const APP_NAME = "Finanças";

/** E-mail de contato para privacidade (LGPD). Defina CONTACT_EMAIL na Vercel. */
export function contactEmail() {
  return process.env.CONTACT_EMAIL || null;
}

export const POLICY_UPDATED_AT = "21 de outubro de 2026";
