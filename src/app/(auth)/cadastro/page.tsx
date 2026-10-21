"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register } from "@/app/actions";

export default function CadastroPage() {
  // Trocar a key recria o formulário (para corrigir o e-mail depois do envio)
  const [attempt, setAttempt] = useState(0);
  return <SignupForm key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}

function SignupForm({ onRetry }: { onRetry: () => void }) {
  const [state, action, pending] = useActionState(register, undefined);

  if (state?.ok) {
    return (
      <div className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Confirme seu e-mail</h1>
          <p className="text-sm text-muted">Falta só um passo para criar a sua conta.</p>
        </div>
        <p className="rounded-xl bg-positive/10 p-3 text-sm text-positive">
          Enviamos um link de confirmação para <b className="break-all">{state.message}</b>. Abra o e-mail e clique em
          “Confirmar meu e-mail”. O link vale por 24 horas.
        </p>
        <p className="text-xs text-muted">
          A conta só é criada depois da confirmação. Não chegou? Confira o lixo eletrônico. Se o e-mail acima estiver errado,
          corrija e envie de novo.
        </p>
        <button type="button" className="btn btn-ghost w-full" onClick={onRetry}>
          Corrigir o e-mail ou reenviar
        </button>
        <p className="text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-primary">
            Voltar para o login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <p className="text-sm text-muted">Vamos enviar um link para confirmar o seu e-mail antes de criar a conta.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="emailConfirm">Repita o e-mail</label>
        <input
          className="input"
          id="emailConfirm"
          name="emailConfirm"
          type="email"
          autoComplete="off"
          required
          onPaste={(e) => e.preventDefault()} // obriga a digitar de novo, para pegar erros de digitação
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha (mínimo 8 caracteres)</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Enviando…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </form>
  );
}
