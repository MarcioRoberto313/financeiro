"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions";

export default function EsqueciSenhaPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
        <p className="text-sm text-muted">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      </div>
      {state?.ok ? (
        <p className="rounded-xl bg-positive/10 p-3 text-sm text-positive">{state.message}</p>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          {state?.error && <p className="text-sm text-negative">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar link"}
          </button>
        </>
      )}
      <p className="text-center text-sm text-muted">
        Lembrou?{" "}
        <Link href="/login" className="font-medium text-primary">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
