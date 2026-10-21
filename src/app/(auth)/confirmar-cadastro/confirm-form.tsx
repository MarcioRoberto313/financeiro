"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmSignup } from "@/app/actions";

/**
 * A conta só é criada ao clicar no botão (e não ao abrir o link): alguns provedores,
 * como o Outlook, abrem os links dos e-mails sozinhos para verificar segurança.
 */
export function ConfirmSignupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmSignup, undefined);

  if (state?.ok) {
    return (
      <div className="card space-y-4">
        <h1 className="text-xl font-semibold">{state.message}</h1>
        <p className="text-sm text-muted">Seu e-mail foi confirmado. Agora é só entrar com o e-mail e a senha que você cadastrou.</p>
        <Link href="/login" className="btn btn-primary w-full">
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <h1 className="text-xl font-semibold">Confirmar cadastro</h1>
        <p className="text-sm text-muted">Clique no botão abaixo para confirmar o seu e-mail e criar a sua conta.</p>
      </div>
      {state?.error && (
        <p className="text-sm text-negative">
          {state.error}{" "}
          <Link href="/cadastro" className="font-medium text-primary underline">
            Fazer cadastro
          </Link>
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Criando sua conta…" : "Confirmar e criar conta"}
      </button>
    </form>
  );
}
