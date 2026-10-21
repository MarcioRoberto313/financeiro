"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  if (state?.ok) {
    return (
      <div className="card space-y-4">
        <h1 className="text-xl font-semibold">Senha alterada</h1>
        <p className="text-sm text-muted">
          Por segurança, todos os aparelhos conectados à sua conta foram desconectados. Entre com a nova senha.
        </p>
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
        <h1 className="text-xl font-semibold">Criar nova senha</h1>
        <p className="text-sm text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <div>
        <label className="label" htmlFor="password">Nova senha</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Repita a nova senha</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && (
        <p className="text-sm text-negative">
          {state.error}{" "}
          {state.error.includes("expirou") && (
            <Link href="/esqueci-senha" className="font-medium text-primary underline">
              Pedir novo link
            </Link>
          )}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
