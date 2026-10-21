"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestPasswordReset } from "@/app/actions";

export default function EsqueciSenhaPage() {
  // Trocar a key recria o formulário do zero (limpa a confirmação e mostra o campo de novo)
  const [attempt, setAttempt] = useState(0);
  return <ResetRequestForm key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}

function ResetRequestForm({ onRetry }: { onRetry: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
        <p className="text-sm text-muted">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      </div>
      {state?.ok ? (
        <>
          <p className="rounded-xl bg-positive/10 p-3 text-sm text-positive">{state.message}</p>
          <p className="text-xs text-muted">
            Não chegou? Confira o lixo eletrônico e aguarde alguns minutos. Um novo pedido para o mesmo e-mail só é aceito
            depois de 2 minutos.
          </p>
          <button type="button" className="btn btn-ghost w-full" onClick={onRetry}>
            Usar outro e-mail ou pedir novamente
          </button>
        </>
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
