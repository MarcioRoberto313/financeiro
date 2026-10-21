import "server-only";
import nodemailer from "nodemailer";

type Message = { to: string; subject: string; html: string; text: string };

/**
 * Envio de e-mail, nesta ordem de preferência:
 * 1. Gmail (SMTP) — GMAIL_USER + GMAIL_APP_PASSWORD (senha de app do Google, não a senha normal).
 * 2. Resend (API) — RESEND_API_KEY e, opcionalmente, EMAIL_FROM. Sem domínio verificado,
 *    o remetente onboarding@resend.dev só entrega para o e-mail da conta Resend.
 * 3. Em desenvolvimento, sem nenhum dos dois, o conteúdo é mostrado no terminal.
 */
export async function sendEmail(msg: Message) {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return sendWithGmail(msg);
  return sendWithResend(msg);
}

async function sendWithGmail({ to, subject, html, text }: Message) {
  const user = process.env.GMAIL_USER!;
  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      // A senha de app vem com espaços ("abcd efgh ijkl mnop"); o Google aceita sem eles
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    });
    await transport.sendMail({ from: `"Finanças" <${user}>`, to, subject, html, text });
    return { ok: true as const };
  } catch (err) {
    console.error("Falha ao enviar e-mail pelo Gmail:", err instanceof Error ? err.message : err);
    return { ok: false as const };
  }
}

async function sendWithResend({ to, subject, html, text }: Message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      // Desenvolvimento sem chave: mostra o conteúdo no terminal para testar o fluxo
      console.log(`\n[email de teste] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
      return { ok: true as const };
    }
    console.error("Nenhum serviço de e-mail configurado (GMAIL_USER/GMAIL_APP_PASSWORD ou RESEND_API_KEY).");
    return { ok: false as const };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Finanças <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    console.error("Falha ao enviar e-mail pelo Resend:", res.status, await res.text().catch(() => ""));
    return { ok: false as const };
  }
  return { ok: true as const };
}

export function passwordResetEmail(name: string, link: string) {
  const first = name.split(" ")[0];
  const text = `Olá, ${first}!

Recebemos um pedido para redefinir a senha da sua conta no Finanças.
Para criar uma nova senha, abra o link abaixo (válido por 1 hora):

${link}

Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.`;
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:24px auto;background:#ffffff;border:1px solid #e4e7ef;border-radius:16px;padding:28px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:bold">Finanças</p>
    <p style="margin:0 0 12px">Olá, ${escapeHtml(first)}!</p>
    <p style="margin:0 0 20px;line-height:1.5">Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link vale por <b>1 hora</b>.</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold">Criar nova senha</a></p>
    <p style="margin:0 0 8px;font-size:12px;color:#64748b">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b">Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.</p>
  </div>
</body></html>`;
  return { subject: "Redefinir sua senha – Finanças", html, text };
}

export function signupConfirmationEmail(name: string, link: string) {
  const first = name.split(" ")[0];
  const text = `Olá, ${first}!

Para concluir o seu cadastro no Finanças, confirme o seu e-mail abrindo o link abaixo (válido por 24 horas):

${link}

Se você não se cadastrou, ignore este e-mail: nenhuma conta será criada.`;
  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:24px auto;background:#ffffff;border:1px solid #e4e7ef;border-radius:16px;padding:28px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:bold">Finanças</p>
    <p style="margin:0 0 12px">Olá, ${escapeHtml(first)}!</p>
    <p style="margin:0 0 20px;line-height:1.5">Falta só um passo para criar a sua conta: confirme que este e-mail é seu. O link vale por <b>24 horas</b>.</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:bold">Confirmar meu e-mail</a></p>
    <p style="margin:0 0 8px;font-size:12px;color:#64748b">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b">Se você não se cadastrou, ignore este e-mail: nenhuma conta será criada.</p>
  </div>
</body></html>`;
  return { subject: "Confirme seu cadastro – Finanças", html, text };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
